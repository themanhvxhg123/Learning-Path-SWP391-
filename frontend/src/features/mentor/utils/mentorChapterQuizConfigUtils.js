import {
  TEST_SKILL_LISTENING,
  TEST_SKILL_QB_LABELS,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
} from '@/features/mentor/utils/mentorTestContentUtils';

export const CHAPTER_QUIZ_SKILLS = [
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
];

/** chapterId đặc biệt lưu cấu hình quiz toàn khóa trong cùng storage chapter quiz. */
export const COURSE_QUIZ_CHAPTER_ID = '__course__';

export const QUIZ_SETUP_SCOPE_CHAPTER = 'chapter';
export const QUIZ_SETUP_SCOPE_COURSE = 'course';

export function isCourseQuizChapterId(chapterId) {
  return String(chapterId) === COURSE_QUIZ_CHAPTER_ID;
}

function createPartConfig(part, questionCount = 0) {
  return { part, questionCount: Math.max(0, Number(questionCount) || 0) };
}

function resolveWritingQuestionCount(entry = {}) {
  const directCount = Math.max(0, Number(entry.questionCount ?? 0));
  if (directCount > 0 || !(entry.sectionGroups?.length > 0)) {
    return directCount;
  }
  return getWritingQuestionCountFromGroups(entry.sectionGroups);
}

function normalizeWritingPartConfig(entry = {}) {
  return createPartConfig(TEST_SKILL_WRITING, resolveWritingQuestionCount(entry));
}

export function getDefaultChapterQuizConfig({ courseId, chapterId, chapterTitle, chapterIndex = 0 }) {
  const fallbackTitle = chapterTitle?.trim() || `Chương ${chapterIndex + 1}`;
  return {
    id: null,
    courseId,
    chapterId,
    title: `Quiz ${fallbackTitle}`,
    enabled: false,
    timeLimitMinutes: 15,
    passingScore: 70,
    maxAttempts: 3,
    shuffleQuestions: true,
    shuffleAnswers: true,
    questionConfigs: CHAPTER_QUIZ_SKILLS.map((part) => createPartConfig(part)),
    updatedAt: null,
  };
}

export function getDefaultCourseQuizConfig({ courseId, courseTitle = '' }) {
  const fallbackTitle = courseTitle?.trim() || 'toàn khóa';
  return {
    ...getDefaultChapterQuizConfig({
      courseId,
      chapterId: COURSE_QUIZ_CHAPTER_ID,
      chapterTitle: fallbackTitle,
    }),
    title: `Quiz ${fallbackTitle}`,
    timeLimitMinutes: 45,
    selectedChapterIds: [],
  };
}

export function getSelectedChapterIdsFromConfig(config = {}) {
  return (config.selectedChapterIds ?? []).map(String);
}

/** Khởi tạo / làm sạch danh sách chương được chọn khi mở dialog toàn khóa. */
export function initCourseQuizChapterSelection(config = {}, chapterOptions = []) {
  const validIds = new Set(chapterOptions.map((chapter) => String(chapter.PathId)));
  const withBank = chapterOptions.filter((chapter) => chapter.hasBank);
  const existing = getSelectedChapterIdsFromConfig(config).filter((id) => validIds.has(id));

  if (existing.length === 0 && withBank.length > 0) {
    return {
      ...config,
      selectedChapterIds: withBank.map((chapter) => String(chapter.PathId)),
    };
  }

  return {
    ...config,
    selectedChapterIds: existing,
  };
}

export function patchCourseChapterSelection(config = {}, chapterId, selected) {
  const id = String(chapterId);
  const current = new Set(getSelectedChapterIdsFromConfig(config));

  if (selected) {
    current.add(id);
  } else {
    current.delete(id);
  }

  return {
    ...config,
    selectedChapterIds: [...current],
  };
}

export function aggregateCourseStatsByChapterIds(chapters = [], selectedChapterIds = []) {
  const selected = new Set(selectedChapterIds.map(String));
  const selectedChapters = chapters.filter(
    (chapter) => chapter.hasBank && selected.has(String(chapter.PathId)),
  );

  const questionCountBySkill = {
    [TEST_SKILL_LISTENING]: 0,
    [TEST_SKILL_READING]: 0,
    [TEST_SKILL_WRITING]: 0,
  };

  selectedChapters.forEach((chapter) => {
    Object.keys(questionCountBySkill).forEach((skill) => {
      questionCountBySkill[skill] += chapter.questionCountBySkill?.[skill] ?? 0;
    });
  });

  const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    hasBank: selectedChapters.length > 0,
    bankCount: selectedChapters.length,
    questionCountBySkill,
    totalActive,
    selectedChapterCount: selectedChapters.length,
  };
}

export function getWritingSectionGroupsFromConfig(config = {}) {
  const writingEntry = (config.questionConfigs ?? []).find((item) => item.part === TEST_SKILL_WRITING);
  return writingEntry?.sectionGroups ?? [];
}

export function getWritingQuestionCountFromGroups(sectionGroups = []) {
  return sectionGroups
    .filter((group) => group.selected)
    .reduce((sum, group) => sum + Math.max(0, Number(group?.questionCount ?? 0)), 0);
}

export function getQuestionCountForPart(config = {}, part) {
  const item = (config.questionConfigs ?? []).find((entry) => entry.part === part);
  if (part === TEST_SKILL_WRITING) {
    return resolveWritingQuestionCount(item ?? {});
  }
  return Math.max(0, Number(item?.questionCount ?? 0));
}

export function getChapterQuizConfigTotal(config = {}) {
  return CHAPTER_QUIZ_SKILLS.reduce(
    (sum, part) => sum + getQuestionCountForPart(config, part),
    0,
  );
}

export function mergeWritingSectionGroups(existingGroups = [], bankGroups = []) {
  return bankGroups.map((bankGroup) => {
    const existing = existingGroups.find(
      (group) => group.sectionTempId === bankGroup.sectionTempId,
    );
    return {
      sectionTempId: bankGroup.sectionTempId,
      sectionTitle: bankGroup.sectionTitle,
      selected: Boolean(existing?.selected),
      questionCount: Math.max(0, Number(existing?.questionCount ?? 0)),
    };
  });
}

/** Chuẩn hoá config quiz sau khi load bank (migrate cấu hình nhóm TV-NP cũ). */
export function syncChapterQuizConfigWithStats(config = {}, stats = null) {
  if (!config || !stats?.hasBank) return config;

  return {
    ...config,
    questionConfigs: (config.questionConfigs ?? []).map((item) => {
      if (item.part !== TEST_SKILL_WRITING) return item;
      return normalizeWritingPartConfig(item);
    }),
  };
}

export function patchQuestionConfig(config, part, questionCount) {
  const nextCount = Math.max(0, Number.parseInt(String(questionCount), 10) || 0);
  const questionConfigs = CHAPTER_QUIZ_SKILLS.map((skill) => {
    const existing = (config.questionConfigs ?? []).find((entry) => entry.part === skill);
    if (skill === part) {
      return createPartConfig(skill, nextCount);
    }
    if (skill === TEST_SKILL_WRITING) {
      return normalizeWritingPartConfig(existing ?? {});
    }
    return createPartConfig(skill, Math.max(0, Number(existing?.questionCount ?? 0)));
  });

  return { ...config, questionConfigs };
}

export function patchWritingSectionGroup(config, sectionTempId, patch) {
  const questionConfigs = (config.questionConfigs ?? []).map((item) => {
    if (item.part !== TEST_SKILL_WRITING) return item;

    const sectionGroups = (item.sectionGroups ?? []).map((group) => {
      if (group.sectionTempId !== sectionTempId) return group;
      const next = { ...group, ...patch };
      if ('questionCount' in patch) {
        next.questionCount = Math.max(0, Number.parseInt(String(patch.questionCount), 10) || 0);
      }
      if ('selected' in patch && !patch.selected) {
        next.questionCount = 0;
      }
      return next;
    });

    return {
      ...item,
      sectionGroups,
      questionCount: getWritingQuestionCountFromGroups(sectionGroups),
    };
  });

  return { ...config, questionConfigs };
}

export function validateChapterQuizConfig(config = {}, stats = null) {
  const errors = {};

  if (!stats?.hasBank) {
    errors._bank = isCourseQuizChapterId(config.chapterId)
      ? 'Không thể lưu thiết lập vì khóa học chưa có ngân hàng câu hỏi nào.'
      : 'Không thể lưu thiết lập vì chương chưa có ngân hàng câu hỏi.';
    return errors;
  }

  const title = String(config.title ?? '').trim();
  if (!title) {
    errors.title = 'Vui lòng nhập tên bài kiểm tra';
  }

  const timeLimit = Number(config.timeLimitMinutes ?? 0);
  if (!Number.isFinite(timeLimit) || timeLimit <= 0) {
    errors.timeLimitMinutes = 'Thời gian làm bài phải lớn hơn 0';
  }

  const passingScore = Number(config.passingScore ?? 0);
  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) {
    errors.passingScore = 'Điểm đạt phải từ 0 đến 100';
  }

  const maxAttempts = Number(config.maxAttempts ?? 0);
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1) {
    errors.maxAttempts = 'Số lần làm lại phải ít nhất 1';
  }

  if (!config.enabled) {
    return errors;
  }

  if (isCourseQuizChapterId(config.chapterId)) {
    const selectedChapterIds = getSelectedChapterIdsFromConfig(config);
    if (selectedChapterIds.length === 0) {
      errors._chapters = 'Vui lòng chọn ít nhất một chương khi bật kiểm tra toàn khóa.';
      return errors;
    }
  }

  const total = getChapterQuizConfigTotal(config);
  if (total <= 0) {
    errors._total = 'Vui lòng cấu hình ít nhất 1 câu hỏi khi bật kiểm tra';
  }

  [TEST_SKILL_LISTENING, TEST_SKILL_READING, TEST_SKILL_WRITING].forEach((part) => {
    const count = getQuestionCountForPart(config, part);
    const available = stats?.questionCountBySkill?.[part] ?? 0;
    const label = TEST_SKILL_QB_LABELS[part];

    if (!Number.isFinite(count) || count < 0) {
      errors[part] = `Số câu ${label} không hợp lệ`;
      return;
    }

    if (count > available) {
      errors[part] =
        `Phần ${label} hiện chỉ có ${available} câu đang bật, không đủ để lấy ${count} câu.`;
    }
  });

  return errors;
}

export function hasChapterQuizConfigErrors(errors = {}) {
  return Object.keys(errors).length > 0;
}
