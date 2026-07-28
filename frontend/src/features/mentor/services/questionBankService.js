/**
 * Question bank — UI-only stubs (không gọi API).
 * Giữ chữ ký hàm để các màn hình/dialog vẫn render.
 */

const TODO = 'Ngân hàng câu hỏi chỉ hiển thị giao diện — chưa kết nối xử lý.';

const emptyStats = {
  ok: true,
  hasBank: false,
  questionCountBySkill: {
    LISTENING: 0,
    READING: 0,
    VOCABULARY: 0,
  },
  listeningSectionGroups: [],
  readingSectionGroups: [],
  vocabularySectionGroups: [],
  totalActive: 0,
};

function mapSectionGroups(groups = []) {
  return (groups ?? []).map((group) => ({
    sectionTempId: group.sectionTempId,
    sectionTitle: group.sectionTitle ?? 'Section',
    availableCount: Math.max(0, Number(group.availableCount ?? 0)),
    isUseForTest: group.isUseForTest !== false,
  }));
}

function mapChapterActiveStatsPayload(payload = {}) {
  const questionCountBySkill = {
    LISTENING: Number(payload.questionCountBySkill?.LISTENING) || 0,
    READING: Number(payload.questionCountBySkill?.READING) || 0,
    VOCABULARY:
      Number(payload.questionCountBySkill?.VOCABULARY ?? payload.questionCountBySkill?.WRITING) || 0,
  };
  const totalActive = Number(payload.totalActive);
  const resolvedTotal = Number.isFinite(totalActive)
    ? totalActive
    : Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    hasBank: Boolean(payload.hasBank),
    questionCountBySkill,
    listeningSectionGroups: mapSectionGroups(payload.listeningSectionGroups),
    readingSectionGroups: mapSectionGroups(payload.readingSectionGroups),
    vocabularySectionGroups: mapSectionGroups(
      payload.vocabularySectionGroups ?? payload.writingSectionGroups,
    ),
    totalActive: resolvedTotal,
    questionPathId: payload.questionPathId ?? null,
  };
}

function mapCourseActiveStatsPayload(payload = {}) {
  const chapters = (payload.chapters ?? []).map((chapter) => ({
    PathId: chapter.PathId,
    PathName: chapter.PathName,
    Order: chapter.Order,
    hasBank: Boolean(chapter.hasBank),
    questionCountBySkill: {
      LISTENING: Number(chapter.questionCountBySkill?.LISTENING) || 0,
      READING: Number(chapter.questionCountBySkill?.READING) || 0,
      VOCABULARY:
        Number(chapter.questionCountBySkill?.VOCABULARY ?? chapter.questionCountBySkill?.WRITING) || 0,
    },
    totalActive: Number(chapter.totalActive) || 0,
    listeningSectionGroups: mapSectionGroups(chapter.listeningSectionGroups),
    readingSectionGroups: mapSectionGroups(chapter.readingSectionGroups),
    vocabularySectionGroups: mapSectionGroups(
      chapter.vocabularySectionGroups ?? chapter.writingSectionGroups,
    ),
  }));

  const questionCountBySkill = {
    LISTENING: Number(payload.questionCountBySkill?.LISTENING) || 0,
    READING: Number(payload.questionCountBySkill?.READING) || 0,
    VOCABULARY:
      Number(payload.questionCountBySkill?.VOCABULARY ?? payload.questionCountBySkill?.WRITING) || 0,
  };

  return {
    ok: true,
    hasBank: Boolean(payload.hasBank),
    bankCount: Number(payload.bankCount) || chapters.filter((chapter) => chapter.hasBank).length,
    chapters,
    questionCountBySkill,
    totalActive: Number(payload.totalActive) || 0,
  };
}

export function invalidateQuestionBankListCache() {}

export async function fetchChapterSections() {
  return { ok: true, questionPathId: null, sections: [] };
}

export async function fetchSectionQuestions() {
  return { ok: true, questions: [] };
}

export async function getChapterQuestionBankActiveStats() {
  return { ...emptyStats };
}

export async function getCourseQuestionBankActiveStats() {
  return mapCourseActiveStatsPayload({});
}

export async function getQuestionBanks() {
  return { ok: true, banks: [] };
}

export async function fetchPathQuestionBank() {
  return { ok: false, message: TODO };
}

export async function fetchBankPathList() {
  return { ok: false, message: TODO, bank: null, paths: [] };
}

export async function fetchQuestionBankById() {
  return { ok: false, message: TODO };
}

export async function getQuestionBankById() {
  return { ok: false, message: TODO };
}

export async function setChapterQuestionPublic() {
  return { ok: false, message: TODO };
}

export async function deleteChapterQuestion() {
  return { ok: false, message: TODO };
}

export async function setAllChapterQuestionsPublic() {
  return { ok: false, message: TODO };
}

export async function findQuestionBankByChapter() {
  return { ok: false, message: TODO };
}

export async function getQuestionBankByChapter() {
  return { ok: false, message: TODO };
}

export async function getQuestionBanksByCourse() {
  return { ok: true, banks: [] };
}

export async function getQuestionBanksByScope() {
  return { ok: true, banks: [] };
}

export async function getQuestionBanksForQuiz() {
  return { ok: true, banks: [] };
}

export async function getCourseChapterBankStats() {
  return {
    ok: true,
    chapterBankCount: 0,
    chaptersWithQuestions: 0,
    questionCountBySkill: emptyStats.questionCountBySkill,
    totalQuestions: 0,
    banks: [],
  };
}

export async function getQuestionBankListSummaries() {
  return { ok: true, items: [] };
}

export async function createQuestionBank() {
  return { ok: false, message: TODO };
}

export async function updatePathQuestions() {
  return { ok: false, message: TODO };
}

export async function ensureQuestionPathForChapter() {
  return { ok: true, questionPathId: null, created: false, message: TODO };
}

export async function saveQuestionBankSection() {
  return { ok: true, message: TODO };
}

export async function updateQuestionBankSectionSourceUrl() {
  return { ok: true, sourceUrl: null, message: TODO };
}

export async function updateQuestionUseForTest() {
  return { ok: true, message: TODO };
}

export async function updateQuestionBank() {
  return { ok: false, message: TODO };
}

export async function fetchCoursesForQB() {
  return { ok: true, courses: [] };
}

export async function fetchCourseForQB() {
  return { ok: false, message: TODO };
}

export async function fetchCourseContentOutlineForQB() {
  return { ok: true, chapters: [] };
}

export async function fetchChaptersForCourse() {
  return { ok: true, chapters: [] };
}

export const getCourseChapters = fetchChaptersForCourse;

export async function fetchChaptersWithoutQuestionBank() {
  return { ok: true, chapters: [] };
}

export async function fetchCoursesWithChaptersMissingBank() {
  return { ok: true, courses: [] };
}

export async function fetchCoursesWithoutQuestionBank() {
  return fetchCoursesWithChaptersMissingBank();
}
