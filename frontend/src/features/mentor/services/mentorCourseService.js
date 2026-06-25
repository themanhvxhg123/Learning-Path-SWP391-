/**
 * mentorCourseService.js  ─  Tất cả API calls của Mentor liên quan đến khóa học
 *
 * Base URL: http://localhost:5000/api
 *
 * Auth header bắt buộc cho mọi endpoint mentor:
 *   x-user-id: "<mentorUserId>"
 *
 * ⚠️  HIỆN TẠI ĐANG DÙNG MOCK DATA — thay thế từng hàm khi backend sẵn sàng.
 *     Tìm từ khoá "TODO: replace" để biết điểm cần tích hợp API thật.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  Mỗi hàm trả về: { ok: boolean, ...payload }           │
 * │  ok = true  → thành công                               │
 * │  ok = false → lỗi + message: string                    │
 * └─────────────────────────────────────────────────────────┘
 */

import { mentorCourseDetailById } from '@/features/mentor/data/mentorCourseDetailMock';
import { normalizeMentorCourse } from '@/features/mentor/utils/mentorCourseUtils';
import { normalizeMentorCourseDetail } from '@/features/mentor/utils/mentorCourseDetailUtils';
import {
  computeCourseStudentStats,
  normalizeCourseStudent,
} from '@/features/mentor/utils/mentorCourseStudentsUtils';
import { buildCreateCourseStep1Payload } from '@/features/mentor/utils/mentorCourseFormUtils';
import { saveCreateCourseStep1ToStorage, saveCreateCourseContentToStorage } from '@/features/mentor/utils/mentorCourseCreateStorage';
import { buildCourseContentPayload, buildFullCreateCoursePayload } from '@/features/mentor/utils/mentorCourseContentUtils';
import { uploadPendingMaterialsInPaths } from '@/features/mentor/utils/mentorMaterialUploadUtils';
import { getUser } from '@/features/auth/utils/authUtils';
import { mapMentorCourseComment } from '@/features/mentor/utils/mentorCourseCommentsUtils';
import { getInitialComments } from '@/features/courses/data/courseCommentsMock';

const API_BASE = 'http://localhost:5000/api';

function getMentorAuthHeaders() {
  const userId = getUser()?.userId;
  const headers = { 'Content-Type': 'application/json' };
  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  return headers;
}

function buildUpdateCourseBasicPayload(course = {}) {
  const thumbnail = course.Thumbnail ?? course.thumbnail ?? null;
  return {
    CourseName: course.CourseName ?? course.courseName ?? '',
    Description: course.Description ?? course.description ?? '',
    Thumbnail: thumbnail != null && String(thumbnail).trim() !== '' ? thumbnail : null,
    CategoryId: course.CategoryId ?? course.categoryId ?? null,
    LevelId: course.LevelId ?? course.levelId ?? null,
    IsPublished: Boolean(course.IsPublished ?? course.isPublished),
    InstructorId: course.InstructorId ?? course.instructorId ?? getUser()?.userId ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DANH SÁCH KHÓA HỌC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/mentor/courses
 * Lấy danh sách khóa học của mentor hiện tại.
 *
 * Query params (tuỳ chọn):
 *   q        : string   — tìm theo tên
 *   status   : string   — "published" | "draft" | "all"
 *   category : string
 *   level    : string
 *   sort     : string   — "newest" | "oldest" | "name_asc"
 *   page     : number
 *   pageSize : number
 *
 * Request header:
 *   x-user-id: "42"
 *
 * Response JSON:
 * {
 *   success: true,
 *   courses: [
 *     {
 *       courseId:      number,
 *       courseName:    string,
 *       description:   string,
 *       category:      string,
 *       level:         string,
 *       thumbnail:     string,
 *       isPublished:   boolean,
 *       createdAt:     string,    // ISO date
 *       updatedAt:     string,
 *       chapterCount:  number,
 *       lessonCount:   number,
 *       materialCount: number,
 *       studentCount:  number,
 *       rating:        number
 *     }
 *   ],
 *   total: number
 * }
 *
 * TODO: replace mock with real API call
 */
export async function fetchMentorCourses() {
  try {
    const rawUser = localStorage.getItem("user");

    if (!rawUser) {
      return {
        ok: false,
        message: "Chưa đăng nhập.",
      };
    }

    const user = JSON.parse(rawUser);

    const userId = user.userId;

    if (!userId) {
      return {
        ok: false,
        message: "Không tìm thấy userId trong localStorage.",
      };
    }

    const response = await fetch(`${API_BASE}/courses/my-courses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: Number(userId),
        roleName: "mentor",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        ok: false,
        message: data.message || "Không lấy được khóa học mentor.",
      };
    }

    return {
      ok: true,
      courses: data.data,
      total: data,
    };
  } catch (error) {
    console.error("fetchMentorCourses error:", error);

    return {
      ok: false,
      courses: [],
      total: 0,
      message: "Không thể kết nối máy chủ.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP (CATEGORIES & LEVELS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Lấy danh sách thể loại khóa học.
 *
 * Response JSON:
 * {
 *   success: true,
 *   categories: [
 *     { categoryId: number, displayName: string }
 *   ]
 * }
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
      categories: data.data.map((item) => ({
        value: item.categoryId,
        label: item.displayName,
      })),
    };
  } catch (error) {
    return { ok: false, categories: [], message: error.message };
  }
}

/**
 * GET /api/levels
 * Lấy danh sách cấp độ khóa học.
 *
 * Response JSON:
 * {
 *   success: true,
 *   levels: [
 *     { levelId: number, displayName: string }
 *   ]
 * }
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
      levels: (data.data ?? []).map((item) => ({
        value: item.levelId,
        label: item.displayName,
      })),
    };
  } catch (err) {
    console.error(err.message);
    return { ok: false, levels: [], message: 'Lỗi fetchCourseLevels' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TẠO KHÓA HỌC MỚI (3 BƯỚC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/mentor/courses/draft  (Bước 1)
 * Tạo bản nháp khóa học với thông tin cơ bản.
 *
 * Request JSON:
 * {
 *   courseName:  string,
 *   description: string,
 *   categoryId:  number,
 *   levelId:     number,
 *   thumbnail:   string | null,   // base64 hoặc URL
 *   isFree:      boolean,
 *   price:       number | null
 * }
 *
 * Request header:
 *   x-user-id: "42"
 *
 * Response JSON:
 * {
 *   success:  true,
 *   courseId: number,             // ID bản nháp vừa tạo
 *   message:  "Bản nháp đã được tạo."
 * }
 *
 * TODO: replace mock with real API call
 */
export async function saveCreateCourseStep1(form, instructorId) {
  const payload = buildCreateCourseStep1Payload(form, instructorId);

  // // TODO: replace with real API
  // const response = await fetch(`${API_BASE}/courses/mentor/courses/save/draft`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'x-user-id': String(instructorId) },
  //   body: JSON.stringify(payload),
  // });

  // const data = await response.json();
  // console.table(data)
  // if (!response.success) return { ok: false, message: data.message };

  await delay(200);
  //Save to Session
  saveCreateCourseStep1ToStorage(form, instructorId);
  return { ok: true, payload };
}

/**
 * PUT /api/mentor/courses/:courseId/content  (Bước 2 — lưu nháp nội dung)
 * Lưu cấu trúc nội dung (chương → bài → học liệu).
 *
 * Request JSON:
 * {
 *   paths: [
 *     {
 *       pathId:      number | null,
 *       title:       string,
 *       description: string,
 *       order:       number,
 *       nodes: [
 *         {
 *           nodeId:   number | null,
 *           title:    string,
 *           order:    number,
 *           materials: [
 *             {
 *               materialId:   number | null,
 *               materialType: "VIDEO" | "DOCUMENT" | "TEST",
 *               title:        string,
 *               order:        number,
 *               videoUrl:     string | null,
 *               content:      string | null,
 *               testData:     object | null
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * Response JSON:
 * {
 *   success: true,
 *   message: "Nội dung đã được lưu."
 * }
 *
 * TODO: replace mock with real API call
 */
export async function saveCreateCourseContent(course, paths, meta) {
  const contentPayload = buildCourseContentPayload(paths);

  // TODO: replace with real API
  // await fetch(`${API_BASE}/mentor/courses/${courseId}/content`, {
  //   method: 'PUT', headers: {...}, body: JSON.stringify(contentPayload),
  // });

  await delay(200);
  saveCreateCourseContentToStorage(course, paths, meta);
  return { ok: true, payload: contentPayload };
}

/** Final Create Course Process
 * POST /api/mentor/courses  (Bước 3 — xuất bản)
 * Tạo khóa học hoàn chỉnh (info + content) cùng lúc.
 *
 * Request JSON:  (xem buildFullCreateCoursePayload để biết schema đầy đủ)
 * {
 *   courseName:  string,
 *   description: string,
 *   categoryId:  number,
 *   levelId:     number,
 *   thumbnail:   string | null,
 *   isFree:      boolean,
 *   isPublished: boolean,
 *   paths:       [ ...same as saveCreateCourseContent above... ]
 * }
 *
 * Response JSON:
 * {
 *   success:  true,
 *   courseId: number,
 *   message:  "Khóa học đã được tạo."
 * }
 *
 * TODO: replace mock with real API call
 */
export async function createCourseWithContent(course, paths) {
  try {
    const uploadedPaths = await uploadPendingMaterialsInPaths(paths);
    const payload = buildFullCreateCoursePayload(course, uploadedPaths);

    const response = await fetch(`${API_BASE}/courses/mentor/courses/createCourse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message ?? 'Không thể tạo khóa học.',
      };
    }

    const courseId = data.courseId ?? data.data?.courseId ?? null;
    return { success: true, courseId, payload };
  } catch (error) {
    console.error('[createCourseWithContent]', error);
    return {
      success: false,
      message: error.message ?? 'Không thể tạo khóa học.',
    };
  }
}

/**
 * POST /api/mentor/courses  (alias đơn giản hơn)
 *
 * TODO: replace mock with real API call
 */
export async function createCourse(payload) {
  // TODO: replace with real API
  // const response = await fetch(`${API_BASE}/mentor/courses`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': String(getUser()?.userId) },
  //   body: JSON.stringify(payload),
  // });
  // const data = await response.json();
  // return { ok: response.ok, courseId: data.courseId, message: data.message };

  void payload;
  await delay(600);
  return { ok: true, courseId: Date.now() };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHI TIẾT KHÓA HỌC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/mentor/courses/:courseId
 * Lấy toàn bộ thông tin + cây nội dung của một khóa học.
 *
 * Request header:
 *   x-user-id: "42"
 *
 * Response JSON:
 * {
 *   success: true,
 *   course: {
 *     courseId:      number,
 *     courseName:    string,
 *     description:   string,
 *     category:      string,
 *     level:         string,
 *     thumbnail:     string,
 *     isPublished:   boolean,
 *     isFree:        boolean,
 *     createdAt:     string,
 *     updatedAt:     string,
 *     studentCount:  number,
 *     rating:        number,
 *     paths: [
 *       {
 *         pathId:      number,
 *         title:       string,
 *         description: string,
 *         order:       number,
 *         nodes: [
 *           {
 *             nodeId:   number,
 *             title:    string,
 *             order:    number,
 *             materials: [
 *               {
 *                 materialId:   number,
 *                 materialType: "VIDEO" | "DOCUMENT" | "TEST",
 *                 title:        string,
 *                 order:        number,
 *                 videoUrl:     string | null,
 *                 content:      string | null,
 *                 testData:     object | null
 *               }
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 *
 * TODO: replace mock with real API call
 */
//Get Information of Course by it's id
export async function fetchMentorCourseDetail(courseId) {
  try {
    const [courseRes, studentsRes] = await Promise.all([
      fetch(`${API_BASE}/courses/my-courses/${courseId}?tab=course`),
      fetch(`${API_BASE}/mentor/courses/${courseId}/students`),
    ]);
    const res = await courseRes.json();
    if (!res.success) {
      return {
        success: false,
        message: res.message,
        course: {},
      };
    }

    const course = res.data[0];
    if (course && studentsRes.ok) {
      const studentsJson = await studentsRes.json();
      if (studentsJson.success && Array.isArray(studentsJson.data)) {
        course.StudentCount = studentsJson.data.length;
      }
    }

    return {
      success: true,
      message: 'Lấy course detail thành công',
      course,
    };
  } catch (error) {
    return { success: false, message: 'Lỗi Server', course: {} };
  }
}

// TODO: replace with real API
// const response = await fetch(`${API_BASE}/mentor/courses/${courseId}`, {
//   headers: { 'x-user-id': String(getUser()?.userId) },
// });
// const data = await response.json();
// if (!response.ok) return { ok: false, message: data.message };
// return { ok: true, course: normalizeMentorCourseDetail(data.course) };

// await delay(350);
// const id = Number(courseId);
// const raw = mentorCourseDetailById[id];

// if (!raw) {
//   return { ok: false, message: 'Không tìm thấy khóa học.' };
// }

// return { ok: true, course: normalizeMentorCourseDetail(raw) };
// }

// ─────────────────────────────────────────────────────────────────────────────
// CẬP NHẬT KHÓA HỌC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/mentor/courses/:courseId
 * Cập nhật thông tin cơ bản (tên, mô tả, thumbnail, v.v.).
 *
 * Request JSON:
 * {
 *   courseName:  string,
 *   description: string,
 *   categoryId:  number,
 *   levelId:     number,
 *   thumbnail:   string | null,
 *   isFree:      boolean
 * }
 *
 * Request header:
 *   x-user-id: "42"
 *
 * Response JSON:
 * {
 *   success:  true,
 *   courseId: number,
 *   message:  "Cập nhật thành công."
 * }
 *
 * TODO: replace mock with real API call
 */
export async function updateCourseBasicInfo(courseId, payload) {
  try {
    const response = await fetch(`${API_BASE}/mentor/courses/${courseId}`, {
      method: 'PATCH',
      headers: getMentorAuthHeaders(),
      body: JSON.stringify(buildUpdateCourseBasicPayload(payload)),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        ok: false,
        message: data.message ?? 'Không thể cập nhật thông tin khóa học.',
      };
    }

    return { ok: true, courseId: data.courseId ?? Number(courseId) };
  } catch (error) {
    console.error('[updateCourseBasicInfo]', error);
    return { ok: false, message: 'Lỗi kết nối khi cập nhật khóa học.' };
  }
}

/**
 * PUT /api/mentor/courses/:courseId/content
 * Thay toàn bộ cấu trúc nội dung của khóa học (overwrite).
 *
 * Request JSON: (schema giống saveCreateCourseContent)
 * {
 *   paths: [ ...cấu trúc chương → bài → học liệu... ]
 * }
 *
 * Response JSON:
 * {
 *   success: true,
 *   message: "Nội dung đã được cập nhật."
 * }
 *
 * TODO: replace mock with real API call
 */
export async function updateCourseContent(courseId, paths) {
  try {
    const uploadedPaths = await uploadPendingMaterialsInPaths(paths);
    const payload = buildCourseContentPayload(uploadedPaths);
    const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/content`, {
      method: 'PUT',
      headers: getMentorAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        ok: false,
        message: data.message ?? 'Không thể cập nhật nội dung khóa học.',
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('[updateCourseContent]', error);
    return { ok: false, message: error.message ?? 'Lỗi kết nối khi cập nhật nội dung khóa học.' };
  }
}

/**
 * PATCH /api/mentor/courses/:courseId/publish
 * Bật/tắt trạng thái xuất bản.
 *
 * Request JSON:
 * {
 *   isPublished: boolean
 * }
 *
 * Request header:
 *   x-user-id: "42"
 *
 * Response JSON:
 * {
 *   success: true,
 *   course: { courseId, isPublished, updatedAt, ...thông tin khóa học }
 * }
 *
 * TODO: replace mock with real API call
 */
export async function updateCoursePublishStatus(courseId, isPublished) {
  // TODO: replace with real API

  if (isPublished) {
    // ____________Set PUBLISH__________
    const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/setPublic`)
    const data = await response.json();
    if (!data.success) return { ok: false, message: data.message };
    return { ok: true, courseIdUpdate: data.courseIdUpdate }
  }
  if (!isPublished) {
    // ___________Set DRAFT_____________
    const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/setDraft`)
    const data = await response.json();
    if (!data.success) return { ok: false, message: data.message };
    return { ok: true, courseIdUpdate: data.courseIdUpdate }
  }
  // const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/publish`, {
  //   method: 'PATCH',
  //   headers: { 'Content-Type': 'application/json', 'x-user-id': String(getUser()?.userId) },
  //   body: JSON.stringify({ isPublished }),
  // });
  // const data = await response.json();
  // if (!response.ok) return { ok: false, message: data.message };
  // return { ok: true, course: normalizeMentorCourseDetail(data.course) };

  // await delay(400);
  // const id = Number(courseId);
  // const raw = mentorCourseDetailById[id];

  // if (!raw) {
  //   return { ok: false, message: 'Không tìm thấy khóa học.' };
  // }

  // const updated = { ...raw, IsPublished: Boolean(isPublished) };
  // mentorCourseDetailById[id] = updated;

  // return { ok: true, course: normalizeMentorCourseDetail(updated) };
}

// ─────────────────────────────────────────────────────────────────────────────
// HỌC VIÊN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/mentor/courses/:courseId/students
 * Lấy danh sách học viên trong khóa học (có filter + phân trang).
 *
 * Query params (tuỳ chọn):
 *   q        : string   — tìm theo tên / email
 *   status   : string   — "in_progress" | "completed" | "all"
 *   sort     : string   — "name_asc" | "progress_desc" | "recent"
 *   page     : number
 *   pageSize : number
 *
 * Request header:
 *   x-user-id: "42"
 *
 * Response JSON:
 * {
 *   success: true,
 *   students: [
 *     {
 *       userId:             number,
 *       fullName:           string,
 *       email:              string,
 *       avatar:             string | null,
 *       enrolledAt:         string,     // ISO date
 *       progressPercentage: number,     // 0–100
 *       completedLessons:   number,
 *       totalLessons:       number,
 *       lastActivity:       string,
 *       status:             "in_progress" | "completed"
 *     }
 *   ],
 *   total: number
 * }
 *
 * TODO: replace mock with real API call
 */
export async function fetchCourseStudents(courseId, filters = {}) {
  void filters;
  try {
    const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/students`);
    const res = await response.json();
    if (!response.ok || !res.success) {
      return { ok: false, students: [], message: res.message ?? 'Không lấy được danh sách học viên.' };
    }
    const rows = Array.isArray(res.data) ? res.data : [];
    return { ok: true, students: rows.map(normalizeCourseStudent) };
  } catch (error) {
    return { ok: false, students: [], message: error.message ?? 'Lỗi kết nối server.' };
  }
}

/**
 * GET /api/mentor/courses/:courseId/students/stats
 * Lấy thống kê tổng hợp học viên (dùng cho dashboard card).
 *
 * Response JSON:
 * {
 *   success: true,
 *   stats: {
 *     totalStudents:    number,
 *     completedCount:   number,
 *     inProgressCount:  number,
 *     avgProgress:      number,   // 0–100
 *     recentCount:      number    // enroll trong 7 ngày
 *   }
 * }
 *
 * TODO: replace mock with real API call
 */
export async function fetchCourseStudentStats(courseId) {
  const result = await fetchCourseStudents(courseId);
  if (!result.ok) {
    return { ok: false, stats: computeCourseStudentStats([]), message: result.message };
  }
  return { ok: true, stats: computeCourseStudentStats(result.students) };
}

// ─────────────────────────────────────────────────────────────────────────────
// BÌNH LUẬN KHÓA HỌC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/mentor/courses/:courseId/comments
 */
export async function fetchMentorCourseComments(courseId) {
  try {
    const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/comments`, {
      headers: getMentorAuthHeaders(),
    });
    const res = await response.json();

    if (!response.ok || !res.success) {
      return {
        ok: false,
        comments: [],
        message: res.message ?? 'Không lấy được bình luận.',
      };
    }

    const rows = Array.isArray(res.data) ? res.data : [];
    return {
      ok: true,
      comments: rows.length > 0 ? rows.map(mapMentorCourseComment) : getInitialComments(),
    };
  } catch (error) {
    return {
      ok: false,
      comments: getInitialComments(),
      message: error.message ?? 'Lỗi kết nối server.',
    };
  }
}

/**
 * PATCH /api/mentor/courses/:courseId/comments/:commentId/reply
 */
export async function replyMentorCourseComment(courseId, commentId, content) {
  try {
    const response = await fetch(
      `${API_BASE}/mentor/courses/${courseId}/comments/${commentId}/reply`,
      {
        method: 'PATCH',
        headers: getMentorAuthHeaders(),
        body: JSON.stringify({ content }),
      },
    );
    const res = await response.json();

    if (!response.ok || !res.success || !res.data) {
      return { ok: false, message: res.message ?? 'Không thể gửi phản hồi.' };
    }

    return { ok: true, comment: mapMentorCourseComment(res.data) };
  } catch (error) {
    return { ok: false, message: error.message ?? 'Lỗi kết nối server.' };
  }
}

/**
 * POST /api/mentor/courses/:courseId/comments
 */
export async function createMentorCourseComment(courseId, content) {
  try {
    const response = await fetch(`${API_BASE}/mentor/courses/${courseId}/comments`, {
      method: 'POST',
      headers: getMentorAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    const res = await response.json();

    if (!response.ok || !res.success || !res.data) {
      return { ok: false, message: res.message ?? 'Không thể gửi bình luận.' };
    }

    return { ok: true, comment: mapMentorCourseComment(res.data) };
  } catch (error) {
    return { ok: false, message: error.message ?? 'Lỗi kết nối server.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
