/**
 * questionBankService.js  ─  Mock service cho Question Bank
 *
 * Mô hình: mỗi chương có đúng 1 ngân hàng câu hỏi.
 * Quiz chương lấy từ bank chương; final test random từ nhiều bank chương.
 *
 * TODO: replace mỗi hàm bằng API thật khi backend sẵn sàng.
 */

import { mentorCoursesMock } from '@/features/mentor/data/mentorCoursesMock';
import { mentorQuestionBankSeed } from '@/features/mentor/data/mentorQuestionBankSeed';
import { getUser } from '@/features/auth/utils/authUtils';
import { fetchMentorCourses } from '../services/mentorCourseService';
import {
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
  getQuestionBankSectionDisplayTitle,
  getSectionsBySkill,
} from '@/features/mentor/utils/mentorTestContentUtils';
import axios from 'axios';
import {
  buildQuestionBankApiPayload,
  mapPathBankApiToBank,
} from '@/features/mentor/utils/mentorQuestionBankPayloadUtils';
import { uploadListeningFilesInSections, validateListeningSectionsHaveAudio } from '@/features/mentor/utils/mentorQuestionBankUploadUtils';

const QB_STORAGE_KEY = 'mentor_question_banks_v1';
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
const QB_LIST_CACHE_TTL_MS = 60_000;

let banksApiCache = null;
let mentorCoursesApiCache = null;

export function invalidateQuestionBankListCache() {
  banksApiCache = null;
  mentorCoursesApiCache = null;
}

function readBanksCache() {
  if (!banksApiCache) return null;
  if (Date.now() - banksApiCache.fetchedAt > QB_LIST_CACHE_TTL_MS) {
    banksApiCache = null;
    return null;
  }
  return banksApiCache.banks;
}

function writeBanksCache(banks) {
  banksApiCache = { banks, fetchedAt: Date.now() };
}

function readMentorCoursesCache() {
  if (!mentorCoursesApiCache) return null;
  if (Date.now() - mentorCoursesApiCache.fetchedAt > QB_LIST_CACHE_TTL_MS) {
    mentorCoursesApiCache = null;
    return null;
  }
  return mentorCoursesApiCache.courses;
}

function writeMentorCoursesCache(courses) {
  mentorCoursesApiCache = { courses, fetchedAt: Date.now() };
}

async function fetchMentorCoursesCached(options = {}) {
  const { force = false } = options;
  if (!force) {
    const cached = readMentorCoursesCache();
    if (cached) {
      return { ok: true, courses: cached, total: cached.length };
    }
  }

  const res = await fetchMentorCourses();
  if (res.ok) {
    writeMentorCoursesCache(Array.isArray(res.courses) ? res.courses : []);
  }
  return res;
}

function getAuthHeaders() {
  const user = getUser();
  const userId = user?.userId ?? user?.UserId;
  const headers = { 'Content-Type': 'application/json' };
  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  return headers;
}

function mapPathsToChapters(paths = []) {
  return paths.map((path, pathIndex) => ({
    PathId: path.PathId,
    PathName: String(path.PathName ?? '').trim() || `Chương ${pathIndex + 1}`,
    Order: path.Order ?? pathIndex + 1,
    Nodes: (path.Nodes ?? []).map((node, nodeIndex) => ({
      NodeId: node.NodeId,
      NodeName: String(node.NodeName ?? '').trim() || `Bài ${nodeIndex + 1}`,
      NodeOrder: node.NodeOrder ?? nodeIndex + 1,
    })),
  }));
}

function loadStoredBanks() {
  try {
    const raw = localStorage.getItem(QB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredBanks(banks) {
  try {
    localStorage.setItem(QB_STORAGE_KEY, JSON.stringify(banks));
  } catch {
    // storage full or unavailable
  }
}

/** Chỉ bank gắn chương (bỏ legacy scope COURSE không có chapterId). */
function normalizeBank(bank) {
  if (bank?.chapterId == null || bank.chapterId === '') return null;
  const { scope: _scope, ...rest } = bank;
  const chapterTitle = rest.chapterTitle?.trim() ?? '';
  return {
    ...rest,
    title: chapterTitle || rest.title?.trim() || '',
  };
}

function getAllBanks() {
  const stored = loadStoredBanks();
  const storedIds = new Set(stored.map((b) => b.id));
  const seeded = mentorQuestionBankSeed
    .map(normalizeBank)
    .filter(Boolean)
    .filter((b) => !storedIds.has(b.id));
  return [...stored.map(normalizeBank).filter(Boolean), ...seeded];
}

function nextId() {
  const banks = getAllBanks();
  const maxId = banks.reduce((m, b) => (typeof b.id === 'number' && b.id > m ? b.id : m), 0);
  return maxId + 1;
}

function countSectionQuestions(sections = []) {
  return sections.reduce((sum, s) => sum + (s.Questions?.length ?? 0), 0);
}

function mapApiBankRow(row) {
  return {
    BankId: row.BankId ?? row.bankId ?? row.id,
    CourseId: row.CourseId ?? row.courseId,
    PathId: row.PathId ?? row.pathId ?? row.chapterId,
    Title: row.Title ?? row.title ?? '',
    Description: row.Description ?? row.description ?? '',
    InstructorId: row.InstructorId ?? row.instructorId,
    CreatedAt: row.CreatedAt ?? row.createdAt,
    UpdatedAt: row.UpdatedAt ?? row.updatedAt,
    Thumbnail: row.Thumbnail ?? null,
    Sections: row.Sections ?? row.sections ?? [],
  };
}

async function fetchQuestionBanksFromApi(options = {}) {
  const { force = false } = options;
  if (!force) {
    const cached = readBanksCache();
    if (cached) {
      return { ok: true, banks: cached };
    }
  }

  try {
    const response = await axios.get(`${API_BASE}/questionBank/getAll`, {
      headers: getAuthHeaders(),
    });

    if (!response.data?.success) {
      return {
        ok: false,
        message: response.data?.message ?? 'Không lấy được danh sách ngân hàng câu hỏi.',
        banks: [],
      };
    }

    const banks = (response.data.data ?? []).map(mapApiBankRow);
    writeBanksCache(banks);
    return { ok: true, banks };
  } catch (error) {
    console.error('[fetchQuestionBanksFromApi]', error);
    return {
      ok: false,
      message: 'Lỗi kết nối khi tải ngân hàng câu hỏi.',
      banks: [],
    };
  }
}

function resolveCourseStatus(course) {
  if (!course) return 'draft';
  if (course.status === 'published' || course.status === 'PUBLISHED') return 'published';
  if (course.IsPublished === 1 || course.IsPublished === true) return 'published';
  return 'draft';
}

function buildSummaryFromBanks(banks = [], courses = []) {
  const courseMap = new Map(
    courses.map((course) => [String(course.CourseId ?? course.courseId), course]),
  );
  const byCourse = new Map();

  banks.forEach((bank) => {
    const courseId = bank.CourseId;
    const key = String(courseId);
    const existing = byCourse.get(key) ?? {
      CourseId: Number(courseId),
      CourseName: '',
      Description: '',
      Status: 'draft',
      TotalQuestionCount: 0,
      PublishedQuestionCount: 0,
      DraftQuestionCount: 0,
      ChapterWithQuestionCount: 0,
      QuizCount: 0,
      QuestionBankUpdatedAt: null,
      Thumbnail: null,
      BankIds: [],
      LevelId: null,
      LevelName: null,
      LevelDisplayName: '',
      CategoryId: null,
      CategoryDisplayName: '',
      UpdatedAt: null,
      StudentCount: 0,
    };

    if (bank.Thumbnail) existing.Thumbnail = bank.Thumbnail;
    existing.ChapterWithQuestionCount += 1;
    if (bank.BankId != null && !existing.BankIds.includes(bank.BankId)) {
      existing.BankIds.push(bank.BankId);
    }
    const updatedAt = bank.UpdatedAt;
    if (
      updatedAt &&
      (!existing.QuestionBankUpdatedAt ||
        new Date(updatedAt).getTime() > new Date(existing.QuestionBankUpdatedAt).getTime())
    ) {
      existing.QuestionBankUpdatedAt = updatedAt;
    }

    byCourse.set(key, existing);
  });

  return [...byCourse.values()]
    .map((item) => {
      const course = courseMap.get(String(item.CourseId));
      if (!course) return item;

      return {
        ...item,
        CourseName: course.CourseName ?? course.courseName ?? '',
        Description: course.Description ?? course.description ?? '',
        Status: resolveCourseStatus(course),
        Thumbnail: course.Thumbnail ?? item.Thumbnail ?? null,
        LevelId: course.LevelId ?? course.levelId ?? null,
        LevelName: course.LevelName ?? course.levelName ?? null,
        LevelDisplayName:
          course.LevelDisplayName ?? course.levelName ?? course.level ?? '',
        CategoryId: course.CategoryId ?? course.categoryId ?? null,
        CategoryDisplayName:
          course.CategoryDisplayName ?? course.categoryName ?? course.category ?? '',
        UpdatedAt: course.UpdatedAt ?? course.updatedAt ?? null,
        StudentCount: Number(course.StudentCount ?? course.studentCount ?? 0) || 0,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.QuestionBankUpdatedAt ?? 0).getTime() -
        new Date(a.QuestionBankUpdatedAt ?? 0).getTime(),
    );
}

function filterByCourse(banks, courseId) {
  return banks.filter(
    (b) => String(b.CourseId ?? b.courseId) === String(courseId),
  );
}

function countActiveQuestionsInSection(section) {
  return (section?.Questions ?? []).filter(
    (q) => String(q?.QuestionText ?? '').trim() && q?.isActive !== false,
  ).length;
}

function getWritingSectionGroupsFromSections(sections = []) {
  const bankSections = getSectionsBySkill(sections, TEST_SKILL_WRITING);
  return bankSections.map((section) => ({
    sectionTempId: section.tempId,
    sectionTitle: getQuestionBankSectionDisplayTitle(section, sections),
    activeCount: countActiveQuestionsInSection(section),
  }));
}

function countQuestionsBySkill(sections = []) {
  return sections.reduce(
    (acc, section) => {
      const skill = section.SkillType;
      if (!skill) return acc;
      const activeCount = (section.Questions ?? []).filter(
        (q) => String(q?.QuestionText ?? '').trim() && q?.isActive !== false,
      ).length;
      acc[skill] = (acc[skill] ?? 0) + activeCount;
      return acc;
    },
    {
      [TEST_SKILL_LISTENING]: 0,
      [TEST_SKILL_READING]: 0,
      [TEST_SKILL_WRITING]: 0,
    },
  );
}

/** Thống kê câu hỏi đang bật trong bank của một chương. */
export async function getChapterQuestionBankActiveStats(courseId, chapterId) {
  const res = findQuestionBankByChapter(courseId, chapterId);
  if (!res.ok) {
    return { ok: true, hasBank: false, message: res.message };
  }

  const questionCountBySkill = countQuestionsBySkill(res.bank.sections ?? []);
  const writingSectionGroups = getWritingSectionGroupsFromSections(res.bank.sections ?? []);
  const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    hasBank: true,
    bank: res.bank,
    questionCountBySkill,
    writingSectionGroups,
    totalActive,
  };
}

/** Gom thống kê câu đang bật từ mọi ngân hàng câu hỏi theo chương của khóa học. */
export async function getCourseQuestionBankActiveStats(courseId) {
  const banks = filterByCourse(getAllBanks(), courseId);
  const outlineRes = await fetchCourseContentOutlineForQB(courseId);
  const outlineChapters = outlineRes.ok ? outlineRes.chapters : [];

  const bankByChapterId = new Map(banks.map((bank) => [String(bank.chapterId), bank]));

  const chapters = outlineChapters.map((outlineChapter) => {
    const bank = bankByChapterId.get(String(outlineChapter.PathId));
    if (!bank) {
      return {
        PathId: outlineChapter.PathId,
        PathName: outlineChapter.PathName,
        hasBank: false,
        totalActive: 0,
        questionCountBySkill: {
          [TEST_SKILL_LISTENING]: 0,
          [TEST_SKILL_READING]: 0,
          [TEST_SKILL_WRITING]: 0,
        },
        writingSectionGroups: [],
      };
    }

    const questionCountBySkill = countQuestionsBySkill(bank.sections ?? []);
    const chapterLabel = bank.chapterTitle?.trim() || outlineChapter.PathName;
    const writingSectionGroups = getWritingSectionGroupsFromSections(bank.sections ?? []).map(
      (group) => ({
        sectionTempId: `${bank.chapterId}::${group.sectionTempId}`,
        sectionTitle: `${chapterLabel} · ${group.sectionTitle}`,
        activeCount: group.activeCount,
        chapterId: bank.chapterId,
      }),
    );
    const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

    return {
      PathId: bank.chapterId,
      PathName: chapterLabel,
      hasBank: true,
      totalActive,
      questionCountBySkill,
      writingSectionGroups,
    };
  });

  banks.forEach((bank) => {
    if (chapters.some((chapter) => String(chapter.PathId) === String(bank.chapterId))) {
      return;
    }

    const questionCountBySkill = countQuestionsBySkill(bank.sections ?? []);
    const chapterLabel = bank.chapterTitle?.trim() || `Chương ${bank.chapterId}`;
    const writingSectionGroups = getWritingSectionGroupsFromSections(bank.sections ?? []).map(
      (group) => ({
        sectionTempId: `${bank.chapterId}::${group.sectionTempId}`,
        sectionTitle: `${chapterLabel} · ${group.sectionTitle}`,
        activeCount: group.activeCount,
        chapterId: bank.chapterId,
      }),
    );
    const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

    chapters.push({
      PathId: bank.chapterId,
      PathName: chapterLabel,
      hasBank: true,
      totalActive,
      questionCountBySkill,
      writingSectionGroups,
    });
  });

  if (banks.length === 0) {
    return {
      ok: true,
      hasBank: false,
      bankCount: 0,
      chapters,
      message: 'Khóa học chưa có ngân hàng câu hỏi nào',
    };
  }

  const questionCountBySkill = {
    [TEST_SKILL_LISTENING]: 0,
    [TEST_SKILL_READING]: 0,
    [TEST_SKILL_WRITING]: 0,
  };
  const writingSectionGroups = [];

  chapters
    .filter((chapter) => chapter.hasBank)
    .forEach((chapter) => {
      Object.keys(questionCountBySkill).forEach((skill) => {
        questionCountBySkill[skill] += chapter.questionCountBySkill?.[skill] ?? 0;
      });
      writingSectionGroups.push(...(chapter.writingSectionGroups ?? []));
    });

  const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    hasBank: true,
    bankCount: banks.length,
    chapters,
    questionCountBySkill,
    writingSectionGroups,
    totalActive,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getQuestionBanks() {
  return { ok: true, banks: getAllBanks() };
}

/** Lấy ngân hàng câu hỏi 1 chương từ API. */
export async function fetchPathQuestionBank(courseId, chapterId) {
  try {
    const response = await fetch(
      `${API_BASE}/questionBank/courses/${Number(courseId)}/paths/${Number(chapterId)}/questions`,
      { headers: getAuthHeaders() },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.data) {
      return { ok: false, message: data.message ?? 'Chương chưa có ngân hàng câu hỏi.' };
    }
    return {
      ok: true,
      bank: mapPathBankApiToBank(data.data, courseId, chapterId),
    };
  } catch {
    return { ok: false, message: 'Lỗi kết nối khi tải ngân hàng câu hỏi.' };
  }
}

/** Danh sách Questions_Path của 1 bank. */
export async function fetchBankPathList(bankId) {
  try {
    const response = await fetch(`${API_BASE}/questionBank/${Number(bankId)}/paths`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.data) {
      return { ok: false, message: data.message ?? 'Không tìm thấy ngân hàng câu hỏi.' };
    }
    const row = data.data;
    return {
      ok: true,
      bank: {
        id: row.BankId,
        BankId: row.BankId,
        courseId: row.CourseId,
        courseTitle: row.CourseName ?? '',
        updatedAt: row.UpdatedAt,
      },
      paths: (row.Paths ?? []).map((path) => ({
        PathId: path.PathId,
        PathName: path.PathName,
        Question_Path_Id: path.Question_Path_Id,
        QuestionCount: Number(path.QuestionCount) || 0,
      })),
    };
  } catch {
    return { ok: false, message: 'Lỗi kết nối khi tải danh sách chương.' };
  }
}

/** Lấy ngân hàng theo BankId + chapterId (pathId). */
export async function fetchQuestionBankById(bankId, { chapterId } = {}) {
  if (!chapterId) {
    return { ok: false, message: 'Thiếu chapterId.' };
  }
  try {
    const response = await fetch(
      `${API_BASE}/questionBank/${Number(bankId)}/questions?pathId=${Number(chapterId)}`,
      { headers: getAuthHeaders() },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.data) {
      return { ok: false, message: data.message ?? 'Không tìm thấy ngân hàng câu hỏi.' };
    }
    return {
      ok: true,
      bank: mapPathBankApiToBank(data.data),
    };
  } catch {
    return { ok: false, message: 'Lỗi kết nối khi tải ngân hàng câu hỏi.' };
  }
}

export async function getQuestionBankById(bankId, { courseId, chapterId } = {}) {
  if (courseId && chapterId) {
    const res = await fetchPathQuestionBank(courseId, chapterId);
    if (res.ok) return res;
  }
  return fetchQuestionBankById(bankId, { chapterId });
}

async function chapterQuestionsRequest(courseId, chapterId, suffix, options = {}) {
  const response = await fetch(
    `${API_BASE}/questionBank/courses/${Number(courseId)}/paths/${Number(chapterId)}/questions${suffix}`,
    {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers ?? {}) },
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return { ok: false, message: data.message ?? 'Thao tác thất bại.' };
  }
  return { ok: true, data: data.data };
}

export function setChapterQuestionPublic(courseId, chapterId, questionId, isPublic) {
  return chapterQuestionsRequest(courseId, chapterId, `/${Number(questionId)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ IsActive: Boolean(isPublic) }),
  });
}

export function deleteChapterQuestion(courseId, chapterId, questionId) {
  return chapterQuestionsRequest(courseId, chapterId, `/${Number(questionId)}`, {
    method: 'DELETE',
  });
}

export function setAllChapterQuestionsPublic(courseId, chapterId, isPublic) {
  return chapterQuestionsRequest(courseId, chapterId, '/active-all', {
    method: 'PATCH',
    body: JSON.stringify({ IsActive: Boolean(isPublic) }),
  });
}

export async function findQuestionBankByChapter(courseId, chapterId) {
  const apiRes = await fetchPathQuestionBank(courseId, chapterId);
  if (apiRes.ok) return apiRes;

  const bank = getAllBanks().find(
    (b) => String(b.courseId) === String(courseId) && String(b.chapterId) === String(chapterId),
  );
  if (!bank) return { ok: false, message: 'Chương này chưa có ngân hàng câu hỏi' };
  return { ok: true, bank };
}

export async function getQuestionBankByChapter(courseId, chapterId) {
  return findQuestionBankByChapter(courseId, chapterId);
}

export async function getQuestionBanksByCourse(courseId) {
  try {
    const response = await fetch(
      `${API_BASE}/questionBank/courses/${Number(courseId)}/path-banks`,
      { headers: getAuthHeaders() },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      return { ok: false, message: data.message, banks: [] };
    }

    const banks = (data.data ?? []).map((row) => ({
      id: row.BankId,
      BankId: row.BankId,
      courseId: Number(courseId),
      chapterId: row.PathId,
      chapterTitle: row.PathName,
      title: row.PathName,
      totalQuestionCount: Number(row.QuestionCount) || 0,
      updatedAt: row.UpdatedAt,
    }));
    return { ok: true, banks };
  } catch {
    return { ok: false, message: 'Lỗi kết nối.', banks: [] };
  }
}

/** @deprecated — mỗi chương 1 bank, dùng getQuestionBankByChapter */
export async function getQuestionBanksByScope(courseId, _scope, chapterId = null) {
  if (chapterId != null) {
    const res = await getQuestionBankByChapter(courseId, chapterId);
    return { ok: true, banks: res.ok ? [res.bank] : [] };
  }
  return getQuestionBanksByCourse(courseId);
}

/**
 * Quiz chương: bank duy nhất của chương đó.
 */
export async function getQuestionBanksForQuiz({ courseId, chapterId = null }) {
  if (chapterId != null && chapterId !== '') {
    const res = await getQuestionBankByChapter(courseId, chapterId);
    return { ok: true, banks: res.ok ? [res.bank] : [] };
  }
  return { ok: true, banks: [] };
}

/**
 * Thống kê câu hỏi từ tất cả bank chương (cho final test random).
 */
export async function getCourseChapterBankStats(courseId) {
  const banks = filterByCourse(getAllBanks(), courseId);
  const questionCountBySkill = {
    [TEST_SKILL_LISTENING]: 0,
    [TEST_SKILL_READING]: 0,
    [TEST_SKILL_WRITING]: 0,
  };

  banks.forEach((bank) => {
    const bySkill = countQuestionsBySkill(bank.sections ?? []);
    Object.keys(questionCountBySkill).forEach((skill) => {
      questionCountBySkill[skill] += bySkill[skill] ?? 0;
    });
  });

  const totalQuestions = Object.values(questionCountBySkill).reduce((a, b) => a + b, 0);
  const chaptersWithBank = banks.length;
  const chaptersWithQuestions = banks.filter((b) => countSectionQuestions(b.sections) > 0).length;

  return {
    ok: true,
    chapterBankCount: chaptersWithBank,
    chaptersWithQuestions,
    questionCountBySkill,
    totalQuestions,
    banks,
  };
}

export async function getQuestionBankListSummaries(options = {}) {
  const [apiRes, coursesRes] = await Promise.all([
    fetchQuestionBanksFromApi(options),
    fetchMentorCoursesCached(options),
  ]);

  if (!apiRes.ok) {
    return { ok: false, message: apiRes.message, items: [] };
  }

  const courses = coursesRes.ok ? coursesRes.courses ?? [] : [];
  const items = buildSummaryFromBanks(apiRes.banks, courses);

  return { ok: true, items };
}

export async function createQuestionBank(payload) {
  if (payload.chapterId == null || payload.chapterId === '') {
    return { ok: false, message: 'Vui lòng chọn chương để tạo ngân hàng câu hỏi' };
  }

  const userId = getUser()?.userId ?? getUser()?.UserId;
  if (!userId) {
    return { ok: false, message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
  }

  const courseId = Number(payload.courseId);
  const pathId = Number(payload.chapterId);
  const sections = payload.sections ?? [];

  if (!Number.isInteger(courseId) || !Number.isInteger(pathId)) {
    return { ok: false, message: 'courseId hoặc chapterId không hợp lệ.' };
  }

  try {
    let sectionsWithAudio;
    try {
      sectionsWithAudio = await uploadListeningFilesInSections(sections);
    } catch (uploadError) {
      return {
        ok: false,
        message: uploadError?.message ?? 'Không thể tải file nghe lên. Kiểm tra Cloudinary hoặc dùng link audio.',
      };
    }

    const audioError = validateListeningSectionsHaveAudio(sectionsWithAudio);
    if (audioError) {
      return { ok: false, message: audioError };
    }

    const apiBody = buildQuestionBankApiPayload(sectionsWithAudio, {
      isPublished: false,
      bankDescription: payload.chapterTitle ?? null,
    });

    if (!apiBody.Questions.length) {
      return { ok: false, message: 'Chưa có câu hỏi hợp lệ để lưu.' };
    }

    const response = await fetch(
      `${API_BASE}/questionBank/courses/${courseId}/paths/${pathId}/questions`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(apiBody),
      },
    );

    const rawText = await response.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      const hint =
        response.status === 404
          ? 'Backend chưa có API tạo câu hỏi — hãy restart server backend.'
          : `Phản hồi không hợp lệ (HTTP ${response.status}).`;
      return { ok: false, message: hint };
    }

    if (!response.ok || !data.success) {
      return {
        ok: false,
        message: data.message ?? `Tạo ngân hàng câu hỏi thất bại (HTTP ${response.status}).`,
      };
    }

    invalidateQuestionBankListCache();

    const saved = data.data ?? {};
    const fetchRes = await fetchPathQuestionBank(courseId, pathId);

    return {
      ok: true,
      bank: fetchRes.ok
        ? fetchRes.bank
        : {
            id: saved.BankId,
            BankId: saved.BankId,
            courseId,
            chapterId: pathId,
            title: payload.title?.trim() || payload.chapterTitle?.trim() || '',
            sections: sectionsWithAudio,
            totalQuestionCount: saved.QuestionCount ?? apiBody.Questions.length,
          },
    };
  } catch (error) {
    console.error('[createQuestionBank]', error);
    return {
      ok: false,
      message: error?.message ?? 'Lỗi kết nối khi lưu ngân hàng câu hỏi. Kiểm tra backend đang chạy.',
    };
  }
}

export async function updateQuestionBank(id, patch) {
  const banks = loadStoredBanks();
  const idx = banks.findIndex((b) => b.id === id);
  if (idx === -1) {
    const seedIdx = mentorQuestionBankSeed.findIndex((b) => b.id === id);
    if (seedIdx === -1) return { ok: false, message: 'Không tìm thấy question bank' };
    const updated = {
      ...normalizeBank(mentorQuestionBankSeed[seedIdx]),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    updated.totalQuestionCount = countSectionQuestions(updated.sections ?? []);
    updated.draftQuestionCount = updated.totalQuestionCount;
    banks.unshift(updated);
    saveStoredBanks(banks);
    return { ok: true, bank: updated };
  }

  const now = new Date().toISOString();
  const questionCount = countSectionQuestions(patch.sections ?? banks[idx].sections ?? []);
  banks[idx] = {
    ...banks[idx],
    ...patch,
    updatedAt: now,
    questionBankUpdatedAt: now,
    totalQuestionCount: questionCount,
    draftQuestionCount: questionCount,
  };
  saveStoredBanks(banks);
  return { ok: true, bank: banks[idx] };
}

export async function fetchCoursesForQB(options = {}) {
  const [coursesRes, banksRes] = await Promise.all([
    fetchMentorCoursesCached(options),
    fetchQuestionBanksFromApi(options),
  ]);

  if (!coursesRes.ok) {
    return { ok: false, message: coursesRes.message, courses: [] };
  }

  const courses = Array.isArray(coursesRes.courses) ? coursesRes.courses : [];
  const courseIdsWithBank = new Set(
    (banksRes.ok ? banksRes.banks : []).map((bank) => String(bank.CourseId)),
  );

  return {
    ok: true,
    courses: courses.filter(
      (course) => !courseIdsWithBank.has(String(course.CourseId ?? course.courseId)),
    ),
  };
}

export async function fetchCourseForQB(courseId) {
  const id = String(courseId ?? '').trim();
  if (!id) {
    return { ok: false, message: 'Thiếu mã khóa học' };
  }

  try {
    const response = await fetch(`${API_BASE}/courses/my-courses/${id}?tab=course`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (response.ok && data.success && Array.isArray(data.data) && data.data[0]) {
      return { ok: true, course: data.data[0] };
    }

    const coursesRes = await fetchMentorCourses();
    if (coursesRes.ok) {
      const course = (coursesRes.courses ?? []).find(
        (item) => String(item.CourseId) === id,
      );
      if (course) {
        return { ok: true, course };
      }
    }

    return { ok: false, message: data.message ?? 'Không tìm thấy khóa học' };
  } catch (error) {
    console.error('[fetchCourseForQB]', error);
    return { ok: false, message: 'Lỗi kết nối khi tải thông tin khóa học.' };
  }
}

export async function fetchCourseContentOutlineForQB(courseId) {
  try {
    const response = await fetch(
      `${API_BASE}/courses/my-courses/${courseId}/chapters`,
      { headers: getAuthHeaders() },
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        ok: false,
        message: data.message ?? 'Không thể tải danh sách chương.',
        chapters: [],
      };
    }

    const paths = data.data?.Paths ?? [];
    return { ok: true, chapters: mapPathsToChapters(paths) };
  } catch (error) {
    console.error('[fetchCourseContentOutlineForQB]', error);
    return {
      ok: false,
      message: 'Lỗi kết nối khi tải danh sách chương.',
      chapters: [],
    };
  }
}

export async function fetchChaptersForCourse(courseId) {
  const res = await fetchCourseContentOutlineForQB(courseId);
  if (!res.ok) return res;
  const chapters = res.chapters.map((ch) => ({
    PathId: ch.PathId,
    PathName: ch.PathName,
    Order: ch.Order,
    CourseId: Number(courseId),
  }));
  return { ok: true, chapters };
}

/** @deprecated alias */
export const getCourseChapters = fetchChaptersForCourse;

/** Chương chưa có bank trong một khóa học. */
export async function fetchChaptersWithoutQuestionBank(courseId) {
  const outline = await fetchCourseContentOutlineForQB(courseId);
  if (!outline.ok) return outline;

  const banksRes = await getQuestionBanksByCourse(courseId);
  const bankChapterIds = new Set((banksRes.banks ?? []).map((b) => String(b.chapterId)));

  return {
    ok: true,
    chapters: outline.chapters.filter((ch) => !bankChapterIds.has(String(ch.PathId))),
  };
}

/** Khóa học còn ít nhất một chương chưa có bank. */
export async function fetchCoursesWithChaptersMissingBank() {
  const courses = [];
  for (const course of mentorCoursesMock) {
    const res = await fetchChaptersWithoutQuestionBank(course.courseId);
    if (res.ok && res.chapters.length > 0) {
      courses.push({
        ...course,
        chaptersWithoutBank: res.chapters.length,
      });
    }
  }
  return { ok: true, courses };
}

/** @deprecated — dùng fetchCoursesWithChaptersMissingBank */
export async function fetchCoursesWithoutQuestionBank() {
  return fetchCoursesWithChaptersMissingBank();
}
