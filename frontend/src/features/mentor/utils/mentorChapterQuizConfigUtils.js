import {
  TEST_SKILL_LISTENING,
  TEST_SKILL_QB_LABELS,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
  QUESTION_BANK_SKILLS,
  normalizeQuestionBankSkillType,
  getSectionsBySkill,
  isSectionUseForTest,
  getActiveFilledTestQuestions,
  isQuestionActive,
} from '@/features/mentor/utils/mentorTestContentUtils';

/** Quiz / làm bài kiểm tra: Nghe, Đọc, Từ vựng / Ngữ pháp. */
export const CHAPTER_QUIZ_SKILLS = QUESTION_BANK_SKILLS;

/** chapterId đặc biệt lưu cấu hình quiz toàn khóa trong cùng storage chapter quiz. */
export const COURSE_QUIZ_CHAPTER_ID = '__course__';

export const QUIZ_SETUP_SCOPE_CHAPTER = 'chapter';
export const QUIZ_SETUP_SCOPE_COURSE = 'course';

export function isCourseQuizChapterId(chapterId) {
  return String(chapterId) === COURSE_QUIZ_CHAPTER_ID;
}

export function isSkillSectionRandomPick(part) {
  return part === TEST_SKILL_LISTENING || part === TEST_SKILL_READING;
}

function createPartConfig(part, source = {}) {
  if (isSkillSectionRandomPick(part)) {
    return {
      part,
      sectionCount: Math.max(0, Number(source.sectionCount ?? source.questionCount ?? 0) || 0),
      sectionQuestionCounts: [],
    };
  }

  const sectionQuestionCounts = Array.isArray(source.sectionQuestionCounts)
    ? source.sectionQuestionCounts
      .map((entry) => ({
        sectionTempId: String(entry.sectionTempId ?? ''),
        questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
      }))
      .filter((entry) => entry.sectionTempId)
    : [];

  return {
    part,
    sectionCount: 0,
    sectionQuestionCounts,
  };
}

export function buildSectionGroupsFromChapterSections(sections = [], skillType) {
  const target = normalizeQuestionBankSkillType(skillType);
  return (sections ?? [])
    .filter((section) => normalizeQuestionBankSkillType(section.skillType) === target)
    .map((section) => ({
      sectionTempId: `section_${section.sectionId}`,
      sectionTitle: section.displayName || section.sectionName || 'Section',
      availableCount: Math.max(0, Number(section.questionCount) || 0),
      isUseForTest: section.isUseForTest !== false,
    }));
}

export function getSkillSectionGroupsFromStats(stats = null, skillType) {
  if (!stats) return [];
  if (skillType === TEST_SKILL_LISTENING) return stats.listeningSectionGroups ?? [];
  if (skillType === TEST_SKILL_READING) return stats.readingSectionGroups ?? [];
  if (skillType === TEST_SKILL_VOCABULARY) return stats.vocabularySectionGroups ?? [];
  return [];
}

export function buildCourseSectionTempId(pathId, sectionTempId) {
  const base = String(sectionTempId ?? '');
  if (!base) return '';
  if (base.includes('::')) return base;
  return `${pathId}::${base}`;
}

export function aggregateSkillSectionGroupsFromChapters(
  chapters = [],
  selectedChapterIds = [],
  skillType,
) {
  const selected = new Set(selectedChapterIds.map(String));
  const groups = [];

  chapters
    .filter((chapter) => chapter.hasBank && selected.has(String(chapter.PathId)))
    .forEach((chapter) => {
      getSkillSectionGroupsFromStats(chapter, skillType).forEach((group) => {
        groups.push({
          sectionTempId: buildCourseSectionTempId(chapter.PathId, group.sectionTempId),
          sectionTitle: `${chapter.PathName} · ${group.sectionTitle}`,
          availableCount: Math.max(0, Number(group.availableCount ?? 0)),
          isUseForTest: group.isUseForTest !== false,
        });
      });
    });

  return groups;
}

export function buildChapterQuizPathIdSet(configs = []) {
  return new Set(
    (configs ?? [])
      .map((config) => config?.chapterId ?? config?.pathId)
      .filter((id) => id != null && id !== '')
      .map(String),
  );
}

export function isFirstChapterQuiz(chapterIndex = 0) {
  return Math.max(0, Number(chapterIndex) || 0) === 0;
}

export function getRequiredChapterIdsFromConfig(config = {}) {
  return (config.requiredChapterIds ?? []).map(String);
}

export function sanitizeChapterPrerequisites(config = {}, chapterIndex = 0) {
  if (isFirstChapterQuiz(chapterIndex)) {
    return { ...config, requiredChapterIds: [] };
  }
  return {
    ...config,
    requiredChapterIds: getRequiredChapterIdsFromConfig(config),
  };
}

export function patchRequiredChapterSelection(config = {}, chapterId, selected) {
  const id = String(chapterId);
  const current = new Set(getRequiredChapterIdsFromConfig(config));

  if (selected) {
    current.add(id);
  } else {
    current.delete(id);
  }

  return {
    ...config,
    requiredChapterIds: [...current],
  };
}

export function buildPreviousChapterQuizOptions(paths = [], currentChapterIndex = 0, storedConfigs = []) {
  if (isFirstChapterQuiz(currentChapterIndex)) return [];

  const configByChapterId = new Map(
    (storedConfigs ?? [])
      .filter((item) => !isCourseQuizChapterId(item?.chapterId))
      .map((item) => [String(item.chapterId), item]),
  );

  return paths
    .slice(0, Math.max(0, currentChapterIndex))
    .map((path, index) => {
      const chapterId = String(path.pathId ?? path.PathId ?? '');
      const chapterTitle = path.PathName ?? path.pathName ?? `Chương ${index + 1}`;
      const stored = configByChapterId.get(chapterId);

      return {
        chapterId,
        chapterIndex: index,
        chapterTitle,
        quizTitle: stored?.title?.trim() || `Quiz ${chapterTitle}`,
        quizEnabled: Boolean(stored?.enabled),
      };
    })
    .filter((item) => item.chapterId);
}

export function normalizeQuizQuestionConfigs(config = {}) {
  const questionConfigs = CHAPTER_QUIZ_SKILLS.map((part) => {
    const existing = (config.questionConfigs ?? []).find((entry) => entry.part === part);
    return createPartConfig(part, existing ?? {});
  });

  return { ...config, questionConfigs };
}

/** Gộp config API với Test_Config (thời gian, điểm pass, số lần làm) từ database. */
export function mergeQuizConfigFromApi(config, testConfig, defaults) {
  const merged = {
    ...defaults,
    ...(config ?? {}),
  };

  if (testConfig) {
    if (testConfig.timeLimitMinutes != null && Number.isFinite(Number(testConfig.timeLimitMinutes))) {
      merged.timeLimitMinutes = Number(testConfig.timeLimitMinutes);
    }
    if (testConfig.passingScore != null && Number.isFinite(Number(testConfig.passingScore))) {
      merged.passingScore = Number(testConfig.passingScore);
    }
    if (testConfig.maxAttempts != null && Number.isFinite(Number(testConfig.maxAttempts))) {
      merged.maxAttempts = Number(testConfig.maxAttempts);
    }
  }

  return normalizeQuizQuestionConfigs(merged);
}

export function getSectionCountForPart(config = {}, part) {
  const item = (config.questionConfigs ?? []).find((entry) => entry.part === part);
  return Math.max(0, Number(item?.sectionCount ?? 0));
}

/** Các kỹ năng được mentor bật trong config bài kiểm tra. */
export function getConfiguredSkillTypes(config = {}) {
  return CHAPTER_QUIZ_SKILLS.filter((part) => {
    if (isSkillSectionRandomPick(part)) {
      return getSectionCountForPart(config, part) > 0;
    }
    return getSectionQuestionCountsForPart(config, part).some((entry) => entry.questionCount > 0);
  });
}

export function getSectionQuestionCountsForPart(config = {}, part) {
  const item = (config.questionConfigs ?? []).find((entry) => entry.part === part);
  return (item?.sectionQuestionCounts ?? []).map((entry) => ({
    sectionTempId: String(entry.sectionTempId ?? ''),
    questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
  })).filter((entry) => entry.sectionTempId);
}

export function getSectionQuestionCountForSection(config = {}, part, sectionTempId) {
  const entry = getSectionQuestionCountsForPart(config, part)
    .find((item) => item.sectionTempId === String(sectionTempId));
  return Math.max(0, Number(entry?.questionCount ?? 0));
}

export function isChapterQuizConfigActive(config = null) {
  return Boolean(config?.enabled);
}

/** Nhãn cấp kỹ năng Nghe/Đọc: số section lấy trong bài kiểm tra. */
export function getListeningReadingTestSectionCountLabel(skill, config = null) {
  if (!isChapterQuizConfigActive(config) || !isSkillSectionRandomPick(skill)) return null;
  const count = getSectionCountForPart(config, skill);
  if (count <= 0) return null;
  return `${count} section dùng trong bài kiểm tra`;
}

/** Nhãn cấp kỹ năng Từ vựng/Ngữ pháp: tổng section + câu trong bài kiểm tra. */
export function getVocabularySkillTestUsageLabel(config = null) {
  if (!isChapterQuizConfigActive(config)) return null;
  const entries = getSectionQuestionCountsForPart(config, TEST_SKILL_VOCABULARY)
    .filter((entry) => entry.questionCount > 0);
  if (entries.length === 0) return null;
  const totalQuestions = entries.reduce((sum, entry) => sum + entry.questionCount, 0);
  return `${entries.length} section · ${totalQuestions} câu trong bài kiểm tra`;
}

export function getSkillTestUsageLabel(skill, config = null) {
  if (!isChapterQuizConfigActive(config)) return null;
  if (isSkillSectionRandomPick(skill)) {
    return getListeningReadingTestSectionCountLabel(skill, config);
  }
  if (skill === TEST_SKILL_VOCABULARY) {
    return getVocabularySkillTestUsageLabel(config);
  }
  return null;
}

/** Cấp section Từ vựng/Ngữ pháp: section có trong config bài kiểm tra hay không. */
export function getVocabularySectionTestUsage(sectionTempId, config = null) {
  if (!isChapterQuizConfigActive(config)) {
    return { inTest: false, questionCount: 0, label: null };
  }
  const questionCount = getSectionQuestionCountForSection(
    config,
    TEST_SKILL_VOCABULARY,
    sectionTempId,
  );
  if (questionCount <= 0) {
    return { inTest: false, questionCount: 0, label: null };
  }
  return {
    inTest: true,
    questionCount,
    label: `${questionCount} câu trong bài kiểm tra`,
  };
}

export function getRequiredTestSectionCountForSkill(skill, config = null) {
  if (!isChapterQuizConfigActive(config) || !isSkillSectionRandomPick(skill)) return 0;
  return getSectionCountForPart(config, skill);
}

export function countPublishedQuestionBankSections(sections = [], skill) {
  return getSectionsBySkill(sections, skill).filter(isSectionUseForTest).length;
}

export function getListeningReadingPublishLockMessage(requiredCount) {
  return `Không thể tắt: bài kiểm tra cần ${requiredCount} section xuất bản, hiện đang có đúng ${requiredCount}.`;
}

/** Nghe/Đọc: số section xuất bản phải >= số section lấy trong bài kiểm tra. */
export function validateListeningReadingPublishedSectionQuota(allSections = [], skill, config = null) {
  if (!isSkillSectionRandomPick(skill)) return {};
  const required = getRequiredTestSectionCountForSkill(skill, config);
  if (required <= 0) return {};

  const published = countPublishedQuestionBankSections(allSections, skill);
  if (published >= required) return {};

  const label = TEST_SKILL_QB_LABELS[skill] ?? skill;
  return {
    isUseForTest: `Kỹ năng ${label} cần ít nhất ${required} section xuất bản (hiện có ${published}). Bài kiểm tra đang lấy ${required} section.`,
  };
}

/** Section Nghe/Đọc đang xuất bản có được phép tắt không. */
export function canDisableListeningReadingSectionUseForTest(section, allSections = [], config = null) {
  const skill = section?.SkillType;
  if (!isSkillSectionRandomPick(skill)) return true;
  if (!isSectionUseForTest(section)) return true;

  const required = getRequiredTestSectionCountForSkill(skill, config);
  if (required <= 0) return true;

  const published = countPublishedQuestionBankSections(allSections, skill);
  return published > required;
}

export function isListeningReadingSectionPublishLocked(section, allSections = [], config = null) {
  const skill = section?.SkillType;
  if (!isSkillSectionRandomPick(skill)) return false;
  if (!isSectionUseForTest(section)) return false;

  const required = getRequiredTestSectionCountForSkill(skill, config);
  if (required <= 0) return false;

  const published = countPublishedQuestionBankSections(allSections, skill);
  return published <= required;
}

export function getVocabularySectionRequiredQuestionCount(sectionTempId, config = null) {
  if (!isChapterQuizConfigActive(config)) return 0;
  return getSectionQuestionCountForSection(config, TEST_SKILL_VOCABULARY, sectionTempId);
}

export function isVocabularySectionConfiguredInTest(sectionTempId, config = null) {
  return getVocabularySectionRequiredQuestionCount(sectionTempId, config) > 0;
}

export function getVocabularySectionPublishLockMessage() {
  return 'Không thể tắt: section này đang được dùng trong bài kiểm tra.';
}

export function canDisableVocabularySectionUseForTest(section, config = null) {
  if (section?.SkillType !== TEST_SKILL_VOCABULARY) return true;
  if (!isSectionUseForTest(section)) return true;
  return !isVocabularySectionConfiguredInTest(section?.tempId, config);
}

export function isVocabularySectionPublishLocked(section, config = null) {
  if (section?.SkillType !== TEST_SKILL_VOCABULARY) return false;
  if (!isSectionUseForTest(section)) return false;
  return isVocabularySectionConfiguredInTest(section?.tempId, config);
}

export function countPublishedQuestionsInSection(section) {
  return getActiveFilledTestQuestions(section?.Questions ?? []).length;
}

export function getVocabularyQuestionPublishLockMessage(requiredCount, publishedCount) {
  return `Không thể tắt: bài kiểm tra cần ${requiredCount} câu xuất bản, hiện đang có đúng ${publishedCount}.`;
}

export function canDisableVocabularyQuestionUseForTest(question, section, config = null) {
  if (section?.SkillType !== TEST_SKILL_VOCABULARY) return true;
  if (!isQuestionActive(question)) return true;

  const required = getVocabularySectionRequiredQuestionCount(section?.tempId, config);
  if (required <= 0) return true;

  const published = countPublishedQuestionsInSection(section);
  return published > required;
}

export function isVocabularyQuestionPublishLocked(question, section, config = null) {
  if (section?.SkillType !== TEST_SKILL_VOCABULARY) return false;
  if (!isQuestionActive(question)) return false;

  const required = getVocabularySectionRequiredQuestionCount(section?.tempId, config);
  if (required <= 0) return false;

  const published = countPublishedQuestionsInSection(section);
  return published <= required;
}

/** Từ vựng/Ngữ pháp: section trong bài kiểm tra phải xuất bản và đủ số câu. */
export function validateVocabularySectionQuestionQuota(section, config = null) {
  if (section?.SkillType !== TEST_SKILL_VOCABULARY) return {};

  const required = getVocabularySectionRequiredQuestionCount(section?.tempId, config);
  if (required <= 0) return {};

  if (!isSectionUseForTest(section)) {
    return {
      isUseForTest: 'Section này đang được dùng trong bài kiểm tra, không thể tắt xuất bản.',
    };
  }

  const published = countPublishedQuestionsInSection(section);
  if (published >= required) return {};

  return {
    _questions: `Section cần ít nhất ${required} câu hỏi xuất bản (hiện có ${published}). Bài kiểm tra đang lấy ${required} câu.`,
  };
}

export function getSectionPublishLockMessage(section, allSections = [], config = null) {
  if (isListeningReadingSectionPublishLocked(section, allSections, config)) {
    return getListeningReadingPublishLockMessage(
      getRequiredTestSectionCountForSkill(section?.SkillType, config),
    );
  }
  if (isVocabularySectionPublishLocked(section, config)) {
    return getVocabularySectionPublishLockMessage();
  }
  return '';
}

export function isQuestionBankSectionPublishLocked(section, allSections = [], config = null) {
  return isListeningReadingSectionPublishLocked(section, allSections, config)
    || isVocabularySectionPublishLocked(section, config);
}

export function canDisableQuestionBankSectionUseForTest(section, allSections = [], config = null) {
  if (isSkillSectionRandomPick(section?.SkillType)) {
    return canDisableListeningReadingSectionUseForTest(section, allSections, config);
  }
  if (section?.SkillType === TEST_SKILL_VOCABULARY) {
    return canDisableVocabularySectionUseForTest(section, config);
  }
  return true;
}

export function getVocabularyQuestionTotal(config = {}) {
  return getSectionQuestionCountsForPart(config, TEST_SKILL_VOCABULARY)
    .reduce((sum, entry) => sum + entry.questionCount, 0);
}

export function getChapterQuizConfigSummary(config = {}) {
  return {
    listeningSections: getSectionCountForPart(config, TEST_SKILL_LISTENING),
    readingSections: getSectionCountForPart(config, TEST_SKILL_READING),
    vocabularyQuestions: getVocabularyQuestionTotal(config),
  };
}

export function hasConfiguredQuizSources(config = {}) {
  const summary = getChapterQuizConfigSummary(config);
  return summary.listeningSections > 0
    || summary.readingSections > 0
    || summary.vocabularyQuestions > 0;
}

export function syncPartConfigWithSectionGroups(partConfig = {}, sectionGroups = []) {
  const inTestGroups = (sectionGroups ?? []).filter((group) => group.isUseForTest !== false);

  if (isSkillSectionRandomPick(partConfig.part)) {
    const maxSections = inTestGroups.length;
    return {
      ...partConfig,
      sectionCount: Math.min(Math.max(0, Number(partConfig.sectionCount ?? 0) || 0), maxSections),
    };
  }

  const existing = new Map(
    (partConfig.sectionQuestionCounts ?? []).map((entry) => [
      String(entry.sectionTempId),
      Math.max(0, Number(entry.questionCount ?? 0) || 0),
    ]),
  );

  return {
    ...partConfig,
    sectionQuestionCounts: inTestGroups.map((group) => ({
      sectionTempId: group.sectionTempId,
      questionCount: Math.min(
        existing.get(String(group.sectionTempId)) ?? 0,
        Math.max(0, Number(group.availableCount ?? 0) || 0),
      ),
    })),
  };
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
    requiredChapterIds: [],
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

export function syncCourseQuizChapterPrerequisites(config = {}) {
  const selectedChapterIds = getSelectedChapterIdsFromConfig(config);
  return {
    ...config,
    selectedChapterIds,
    requiredChapterIds: selectedChapterIds,
  };
}

/** Khởi tạo / làm sạch danh sách chương được chọn khi mở dialog toàn khóa. */
export function initCourseQuizChapterSelection(config = {}, chapterOptions = []) {
  const validIds = new Set(chapterOptions.map((chapter) => String(chapter.PathId)));
  const withBank = chapterOptions.filter((chapter) => chapter.hasBank);
  const existing = getSelectedChapterIdsFromConfig(config).filter((id) => validIds.has(id));

  if (existing.length === 0 && withBank.length > 0) {
    return syncCourseQuizChapterPrerequisites({
      ...config,
      selectedChapterIds: withBank.map((chapter) => String(chapter.PathId)),
    });
  }

  return syncCourseQuizChapterPrerequisites({
    ...config,
    selectedChapterIds: existing,
  });
}

export function patchCourseChapterSelection(config = {}, chapterId, selected) {
  const id = String(chapterId);
  const current = new Set(getSelectedChapterIdsFromConfig(config));

  if (selected) {
    current.add(id);
  } else {
    current.delete(id);
  }

  return syncCourseQuizChapterPrerequisites({
    ...config,
    selectedChapterIds: [...current],
  });
}

export function getQuizPrerequisiteChapterIds(config = {}, { courseScope = false } = {}) {
  if (courseScope) {
    return getSelectedChapterIdsFromConfig(config);
  }
  return getRequiredChapterIdsFromConfig(config);
}

export function aggregateCourseStatsByChapterIds(chapters = [], selectedChapterIds = []) {
  const selected = new Set(selectedChapterIds.map(String));
  const selectedChapters = chapters.filter(
    (chapter) => chapter.hasBank && selected.has(String(chapter.PathId)),
  );

  const questionCountBySkill = {
    [TEST_SKILL_LISTENING]: 0,
    [TEST_SKILL_READING]: 0,
    [TEST_SKILL_VOCABULARY]: 0,
  };

  selectedChapters.forEach((chapter) => {
    questionCountBySkill[TEST_SKILL_LISTENING] +=
      chapter.questionCountBySkill?.[TEST_SKILL_LISTENING] ?? 0;
    questionCountBySkill[TEST_SKILL_READING] +=
      chapter.questionCountBySkill?.[TEST_SKILL_READING] ?? 0;
    questionCountBySkill[TEST_SKILL_VOCABULARY] +=
      chapter.questionCountBySkill?.[TEST_SKILL_VOCABULARY]
      ?? chapter.questionCountBySkill?.WRITING
      ?? 0;
  });

  const totalActive = Object.values(questionCountBySkill).reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    hasBank: selectedChapters.length > 0,
    bankCount: selectedChapters.length,
    questionCountBySkill,
    listeningSectionGroups: aggregateSkillSectionGroupsFromChapters(
      chapters,
      selectedChapterIds,
      TEST_SKILL_LISTENING,
    ),
    readingSectionGroups: aggregateSkillSectionGroupsFromChapters(
      chapters,
      selectedChapterIds,
      TEST_SKILL_READING,
    ),
    vocabularySectionGroups: aggregateSkillSectionGroupsFromChapters(
      chapters,
      selectedChapterIds,
      TEST_SKILL_VOCABULARY,
    ),
    totalActive,
    selectedChapterCount: selectedChapters.length,
  };
}

export function getQuestionCountForPart(config = {}, part) {
  if (isSkillSectionRandomPick(part)) {
    return getSectionCountForPart(config, part);
  }
  return getVocabularyQuestionTotal(config);
}

export function getChapterQuizConfigTotal(config = {}, stats = null) {
  let total = getVocabularyQuestionTotal(config);

  if (!stats?.hasBank) {
    return total;
  }

  [TEST_SKILL_LISTENING, TEST_SKILL_READING].forEach((part) => {
    const sectionCount = getSectionCountForPart(config, part);
    if (sectionCount <= 0) return;

    const groups = getSkillSectionGroupsFromStats(stats, part)
      .filter((group) => group.isUseForTest !== false)
      .sort((a, b) => (b.availableCount ?? 0) - (a.availableCount ?? 0));

    total += groups
      .slice(0, sectionCount)
      .reduce((sum, group) => sum + (group.availableCount ?? 0), 0);
  });

  return total;
}

/** Chuẩn hoá config quiz — Nghe / Đọc / Từ vựng–Ngữ pháp. */
export function syncChapterQuizConfigWithStats(config = {}, stats = null) {
  if (!config) return config;
  if (!stats?.hasBank) return normalizeQuizQuestionConfigs(config);

  const questionConfigs = CHAPTER_QUIZ_SKILLS.map((part) => {
    const existing = (config.questionConfigs ?? []).find((entry) => entry.part === part);
    const partConfig = createPartConfig(part, existing ?? {});
    const groups = getSkillSectionGroupsFromStats(stats, part);
    return syncPartConfigWithSectionGroups(partConfig, groups);
  });

  return { ...config, questionConfigs };
}

export function patchSectionCountConfig(config, part, sectionCount) {
  const nextCount = Math.max(0, Number.parseInt(String(sectionCount), 10) || 0);
  const questionConfigs = CHAPTER_QUIZ_SKILLS.map((skill) => {
    const existing = (config.questionConfigs ?? []).find((entry) => entry.part === skill);
    if (skill !== part) return createPartConfig(skill, existing ?? {});
    return { ...createPartConfig(part, existing ?? {}), sectionCount: nextCount };
  });

  return { ...config, questionConfigs };
}

export function patchSectionQuestionCountConfig(config, part, sectionTempId, questionCount) {
  const nextCount = Math.max(0, Number.parseInt(String(questionCount), 10) || 0);
  const id = String(sectionTempId);
  const questionConfigs = CHAPTER_QUIZ_SKILLS.map((skill) => {
    const existing = (config.questionConfigs ?? []).find((entry) => entry.part === skill);
    if (skill !== part) return createPartConfig(skill, existing ?? {});

    const base = createPartConfig(part, existing ?? {});
    const counts = [...(base.sectionQuestionCounts ?? [])];
    const index = counts.findIndex((entry) => entry.sectionTempId === id);

    if (index >= 0) {
      counts[index] = { ...counts[index], questionCount: nextCount };
    } else {
      counts.push({ sectionTempId: id, questionCount: nextCount });
    }

    return { ...base, sectionQuestionCounts: counts };
  });

  return { ...config, questionConfigs };
}

/** @deprecated Dùng patchSectionCountConfig hoặc patchSectionQuestionCountConfig. */
export function patchQuestionConfig(config, part, questionCount) {
  if (isSkillSectionRandomPick(part)) {
    return patchSectionCountConfig(config, part, questionCount);
  }
  return config;
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

  if (!hasConfiguredQuizSources(config)) {
    errors._total = 'Vui lòng cấu hình ít nhất 1 section hoặc câu hỏi khi bật kiểm tra';
  }

  CHAPTER_QUIZ_SKILLS.forEach((part) => {
    const label = TEST_SKILL_QB_LABELS[part];
    const groups = getSkillSectionGroupsFromStats(stats, part);
    const inTestGroups = groups.filter((group) => group.isUseForTest !== false);

    if (isSkillSectionRandomPick(part)) {
      const sectionCount = getSectionCountForPart(config, part);
      if (!Number.isFinite(sectionCount) || sectionCount < 0) {
        errors[part] = `Số section ${label} không hợp lệ`;
        return;
      }

      if (sectionCount > inTestGroups.length) {
        errors[part] =
          `Phần ${label} hiện chỉ có ${inTestGroups.length} section dùng trong bài kiểm tra, không thể lấy ${sectionCount} section.`;
      }
      return;
    }

    getSectionQuestionCountsForPart(config, part).forEach(({ sectionTempId, questionCount }) => {
      const group = inTestGroups.find((item) => item.sectionTempId === sectionTempId);
      if (!group) return;

      if (!Number.isFinite(questionCount) || questionCount < 0) {
        errors[`${part}.${sectionTempId}`] = `Số câu section "${group.sectionTitle}" không hợp lệ`;
        return;
      }

      if (questionCount > (group.availableCount ?? 0)) {
        errors[`${part}.${sectionTempId}`] =
          `Section "${group.sectionTitle}" chỉ có ${group.availableCount ?? 0} câu đang bật, không đủ để lấy ${questionCount} câu.`;
      }
    });
  });

  return errors;
}

export function hasChapterQuizConfigErrors(errors = {}) {
  return Object.keys(errors).length > 0;
}

export function buildChapterQuizPassResolver(modules = [], chapterQuizConfigs = {}) {
  const moduleById = new Map(
    modules.map((mod) => [String(mod.id), mod]),
  );

  return (chapterId) => {
    const mod = moduleById.get(String(chapterId));
    const config = chapterQuizConfigs[chapterId] ?? chapterQuizConfigs[Number(chapterId)];
    const quizEnabled = config?.enabled !== false && config != null;

    return {
      chapterTitle: mod?.title ?? `Chương ${chapterId}`,
      quizTitle: config?.title ?? 'Bài kiểm tra chương',
      quizEnabled,
      passed: !quizEnabled || Boolean(mod?.isTestPassed),
    };
  };
}

export function areQuizPrerequisitesMet(
  config = {},
  modules = [],
  chapterQuizConfigs = {},
  { courseScope = false } = {},
) {
  const requiredChapterIds = getQuizPrerequisiteChapterIds(config, { courseScope });
  return evaluateQuizPrerequisites(
    requiredChapterIds,
    buildChapterQuizPassResolver(modules, chapterQuizConfigs),
  );
}

export function evaluateQuizPrerequisites(requiredChapterIds = [], resolveChapterQuizMeta) {
  const required = (requiredChapterIds ?? []).map(String).filter(Boolean);
  if (required.length === 0) {
    return { ok: true, blockers: [] };
  }

  const blockers = required
    .map((chapterId) => {
      const meta = resolveChapterQuizMeta?.(chapterId) ?? {};
      const passed = Boolean(meta.passed);
      if (passed) return null;
      return {
        chapterId,
        chapterTitle: meta.chapterTitle ?? `Chương ${chapterId}`,
        quizTitle: meta.quizTitle ?? 'Bài kiểm tra chương',
        quizEnabled: meta.quizEnabled !== false,
      };
    })
    .filter(Boolean);

  return {
    ok: blockers.length === 0,
    blockers,
  };
}
