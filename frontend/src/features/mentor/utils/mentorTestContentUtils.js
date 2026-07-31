/**
 * Validate question bank — trùng đề/đáp án: checkDuplicateQuestions([{ id, title, choices }]).
 */
// TODO: backend should support TEST material details: Sections, SkillType, Questions, Options, Pairs, Answers

import {
  AUDIO_EXTENSION_NAMES as AUDIO_ALLOWED_EXTENSION_NAMES,
  getFileExtension as getListeningAudioExtension,
  getMaterialMaxFileSizeLabel as getListeningAudioMaxSizeLabel,
  isAllowedListeningAudioExtension,
  isAllowedListeningAudioFile,
  isAllowedReadingDocExtension,
  isSimpleHttpUrl as isSimpleUrl,
  LISTENING_AUDIO_FILE_ACCEPT,
  LISTENING_AUDIO_INVALID_TYPE_MESSAGE,
  LISTENING_LINK_INVALID_MESSAGE,
  LISTENING_UPLOAD_FAILED_MESSAGE,
  MATERIAL_UPLOAD_MAX_BYTES,
  MATERIAL_UPLOAD_MAX_SIZE_MESSAGE,
  READING_DOC_EXTENSIONS,
  READING_DOC_EXTENSION_NAMES,
  READING_DOC_FILE_ACCEPT,
  READING_DOC_INVALID_TYPE_MESSAGE,
  validateListeningAudioFile,
  validateListeningAudioUrl,
  validateReadingDocFile,
} from '@/shared/utils/materialUploadValidation';
import { isHtmlContentEmpty } from '@/features/mentor/utils/mentorCourseContentUtils';

export {
  MATERIAL_UPLOAD_MAX_BYTES,
  MATERIAL_UPLOAD_MAX_SIZE_MESSAGE,
  READING_DOC_EXTENSIONS,
  READING_DOC_EXTENSION_NAMES,
  READING_DOC_FILE_ACCEPT,
  READING_DOC_INVALID_TYPE_MESSAGE,
  LISTENING_AUDIO_FILE_ACCEPT,
  LISTENING_AUDIO_INVALID_TYPE_MESSAGE,
  LISTENING_LINK_INVALID_MESSAGE,
  LISTENING_UPLOAD_FAILED_MESSAGE,
  AUDIO_EXTENSION_NAMES as AUDIO_ALLOWED_EXTENSION_NAMES,
  validateReadingDocFile,
  validateListeningAudioFile,
  validateListeningAudioUrl,
} from '@/shared/utils/materialUploadValidation';

export { getListeningAudioExtension, getListeningAudioMaxSizeLabel };

export { getCloudinaryDeliveryUrl } from '@/shared/utils/cloudinaryDeliveryUtils';

let testTempIdCounter = 0;

function createTestTempId(prefix = 'tmp') {
  testTempIdCounter += 1;
  return `${prefix}_${Date.now()}_${testTempIdCounter}`;
}

export { createTestTempId };

export const TEST_SKILL_LISTENING = 'LISTENING';
export const TEST_SKILL_READING = 'READING';
/** Từ vựng / Ngữ pháp — không dùng mã WRITING (kỹ năng viết). */
export const TEST_SKILL_VOCABULARY = 'VOCABULARY';

/** Nghe, Đọc, Từ vựng / Ngữ pháp — dùng cho ngân hàng câu hỏi và quiz / làm bài kiểm tra. */
export const QUESTION_BANK_SKILLS = [
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
];

/** @deprecated Dùng QUESTION_BANK_SKILLS cho ngân hàng câu hỏi. */
export const TEST_SKILLS = [
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
];

export const TEST_SKILL_LABELS = {
  [TEST_SKILL_LISTENING]: 'Nghe',
  [TEST_SKILL_READING]: 'Đọc',
  [TEST_SKILL_VOCABULARY]: 'Từ vựng / Ngữ pháp',
};

export const TEST_SKILL_QB_LABELS = TEST_SKILL_LABELS;

export const TEST_SKILL_CHIP_COLORS = {
  [TEST_SKILL_LISTENING]: { color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  [TEST_SKILL_READING]: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
  [TEST_SKILL_VOCABULARY]: { color: '#EA580C', bg: 'rgba(234,88,12,0.12)' },
};

/** Khớp dbo.Section_Type.TypeId */
export const SKILL_TO_TYPE_ID = {
  [TEST_SKILL_LISTENING]: 1,
  [TEST_SKILL_READING]: 2,
  [TEST_SKILL_VOCABULARY]: 3,
  WRITING: 3,
};

const TYPE_ID_TO_SKILL = {
  1: TEST_SKILL_LISTENING,
  2: TEST_SKILL_READING,
  3: TEST_SKILL_VOCABULARY,
};

const LEGACY_WRITING_SKILL = 'WRITING';

export function normalizeQuestionBankSkillType(skillType, typeId = null) {
  const parsedTypeId = Number(typeId);
  if (Number.isInteger(parsedTypeId) && TYPE_ID_TO_SKILL[parsedTypeId]) {
    return TYPE_ID_TO_SKILL[parsedTypeId];
  }

  const normalized = String(skillType ?? '').trim().toUpperCase();
  if (!normalized) return TEST_SKILL_VOCABULARY;
  if (normalized === LEGACY_WRITING_SKILL) return TEST_SKILL_VOCABULARY;
  if (normalized === TEST_SKILL_LISTENING || normalized === 'NGHE') return TEST_SKILL_LISTENING;
  if (normalized === TEST_SKILL_READING || normalized === 'ĐỌC' || normalized === 'DOC') {
    return TEST_SKILL_READING;
  }
  if (
    normalized === TEST_SKILL_VOCABULARY
    || normalized.includes('VỰNG')
    || normalized.includes('VOCAB')
    || normalized.includes('NGỮ PHÁP')
  ) {
    return TEST_SKILL_VOCABULARY;
  }
  if (normalized.includes('NGHE') || normalized.includes('LISTEN')) return TEST_SKILL_LISTENING;
  if (normalized.includes('ĐỌC') || normalized.includes('READ')) return TEST_SKILL_READING;
  return normalized;
}

export function mapSkillTypeToTypeId(skillType) {
  const normalized = normalizeQuestionBankSkillType(skillType);
  return SKILL_TO_TYPE_ID[normalized] ?? SKILL_TO_TYPE_ID[TEST_SKILL_VOCABULARY];
}

export const LISTENING_SOURCE_UPLOAD = 'UPLOAD';
export const LISTENING_SOURCE_LINK = 'LINK';

export const AUDIO_ALLOWED_EXTENSIONS = ['.mp3', '.mp4'];

/** Khớp giới hạn Cloudinary free tier — 10 MB. */
export const AUDIO_MAX_BYTES = MATERIAL_UPLOAD_MAX_BYTES;

export const LISTENING_AUDIO_MAX_SIZE_MESSAGE = MATERIAL_UPLOAD_MAX_SIZE_MESSAGE;

export function isAllowedListeningAudioFileName(fileName) {
  return isAllowedListeningAudioExtension(getListeningAudioExtension(fileName));
}

export function isAllowedAudioFile(file) {
  return isAllowedListeningAudioFile(file);
}

export function getListeningSectionFields() {
  return {
    AudioSourceType: LISTENING_SOURCE_UPLOAD,
    File: null,
    FileName: null,
    FileSize: null,
    AudioUrl: '',
  };
}

export const READING_SOURCE_UPLOAD = 'UPLOAD';
export const READING_SOURCE_COMPOSE = 'COMPOSE';

export function getReadingSectionFields() {
  return {
    ReadingSourceType: READING_SOURCE_COMPOSE,
    File: null,
    FileName: null,
    FileSize: null,
    MaterialUrl: '',
    Description: '',
  };
}

function isBrowserFile(value) {
  return typeof File !== 'undefined' && value instanceof File;
}

/** File .mp3/.mp4 (≤10MB) hoặc link nghe hợp lệ — dùng chung cho question bank & test material. */
export function validateQuestionBankListeningSource(section = {}) {
  const sErrors = {};
  const hasFile = Boolean(section.File || section.FileName);
  const audioUrl = String(section.AudioUrl ?? '').trim();
  const hasLink = Boolean(audioUrl);
  const isLinkSource = section.AudioSourceType === LISTENING_SOURCE_LINK;

  if (!hasFile && !hasLink) {
    sErrors._audio = 'Vui lòng tải file audio hoặc nhập link nghe';
    return sErrors;
  }

  if (isBrowserFile(section.File)) {
    const fileCheck = validateListeningAudioFile(section.File);
    if (!fileCheck.ok) {
      sErrors.File = fileCheck.message;
    }
  } else if (isLinkSource || (!section.FileName && hasLink)) {
    const linkCheck = validateListeningAudioUrl(audioUrl);
    if (!linkCheck.ok) {
      sErrors.AudioUrl = linkCheck.message;
    }
  } else if (hasFile) {
    if (section.FileName && !isAllowedListeningAudioFileName(section.FileName)) {
      sErrors.File = LISTENING_AUDIO_INVALID_TYPE_MESSAGE;
    } else if (Number(section.FileSize) > AUDIO_MAX_BYTES) {
      sErrors.File = LISTENING_AUDIO_MAX_SIZE_MESSAGE;
    }
  }

  return sErrors;
}

/** Bài đọc question bank — bắt buộc có nội dung soạn thảo. */
export function validateQuestionBankReadingComposeSource(section = {}) {
  const sErrors = {};
  if (isHtmlContentEmpty(section.Description)) {
    sErrors.Description = 'Vui lòng soạn nội dung bài đọc.';
  }
  return sErrors;
}

export const QUESTION_TYPE_MULTIPLE_CHOICE = 'MULTIPLE_CHOICE';

/** @deprecated Chỉ dùng khi đọc dữ liệu cũ — chuẩn hoá qua normalizeTestQuestion */
export const LEGACY_QUESTION_TYPE_SINGLE_CHOICE = 'SINGLE_CHOICE';

export const QUESTION_TYPES = [QUESTION_TYPE_MULTIPLE_CHOICE];

export const QUESTION_TYPE_LABELS = {
  [QUESTION_TYPE_MULTIPLE_CHOICE]: 'Trắc nghiệm',
};

export const ANSWER_MODE_SINGLE = 'single';
export const ANSWER_MODE_MULTIPLE = 'multiple';

export const ANSWER_MODE_LABELS = {
  [ANSWER_MODE_SINGLE]: 'Một đáp án',
  [ANSWER_MODE_MULTIPLE]: 'Nhiều đáp án',
};

export const TEST_QUESTION_TEXT_MAX = 250;
export const TEST_QUESTION_TEXT_MIN = 3;
export const TEST_QUESTION_OPTION_TEXT_MAX = 250;
const QUESTION_BANK_DUPLICATE_OPTION_ERROR = 'Trùng lặp';

export function isMultipleChoiceQuestion(question) {
  return Array.isArray(question?.Options);
}

function toBooleanDefaultTrue(value) {
  if (value == null) return true;
  return Boolean(value);
}

export function normalizeTestQuestion(question) {
  if (!question) return createEmptyTestQuestion();

  const options =
    (question.Options ?? []).length >= 2
      ? question.Options
      : createDefaultMultipleChoiceOptions();

  return {
    ...question,
    isActive: toBooleanDefaultTrue(question.isActive),
    isUseForTest: toBooleanDefaultTrue(question.isUseForTest),
    Options: options,
  };
}

export function isQuestionActive(question) {
  return question?.isUseForTest !== false;
}

export const SECTION_USE_FOR_TEST_FILTER = {
  ALL: 'ALL',
  NO: 'NO',
  YES: 'YES',
};

export function isSectionUseForTest(section) {
  return section?.isUseForTest !== false;
}

/** Section có ít nhất một câu đã điền và bật "Dùng trong bài kiểm tra". */
export function hasQuestionUseForTestInSection(section) {
  return getActiveFilledTestQuestions(section?.Questions ?? []).length > 0;
}

export function canEnableSectionUseForTest(section) {
  return hasQuestionUseForTestInSection(section);
}

export const SECTION_USE_FOR_TEST_REQUIRES_QUESTION_MESSAGE =
  'Section phải có ít nhất 1 câu hỏi được dùng trong bài kiểm tra';

export function validateSectionUseForTestRule(section) {
  if (!isSectionUseForTest(section)) return {};
  if (hasQuestionUseForTestInSection(section)) return {};
  return {
    isUseForTest: SECTION_USE_FOR_TEST_REQUIRES_QUESTION_MESSAGE,
  };
}

export function countSectionsByUseForTest(sections = []) {
  const inTest = sections.filter(isSectionUseForTest).length;
  return {
    all: sections.length,
    inTest,
    notInTest: sections.length - inTest,
  };
}

export function filterSectionsByUseForTest(
  sections = [],
  filter = SECTION_USE_FOR_TEST_FILTER.ALL,
) {
  if (filter === SECTION_USE_FOR_TEST_FILTER.IN_TEST) {
    return sections.filter(isSectionUseForTest);
  }
  if (filter === SECTION_USE_FOR_TEST_FILTER.NOT_IN_TEST) {
    return sections.filter((section) => !isSectionUseForTest(section));
  }
  return sections;
}

/** Giữ giá trị isUseForTest đã lưu của section đang chỉnh khi có thay đổi chưa cập nhật. */
export function resolveSectionsForUseForTestFilter(
  sections = [],
  { sectionBaselines = {}, activeSection = null, frozen = false } = {},
) {
  if (!frozen || !activeSection?.tempId) return sections;

  const baselineJson = sectionBaselines[activeSection.tempId];
  if (baselineJson == null) return sections;

  try {
    const baseline = JSON.parse(baselineJson);
    const baselineUseForTest = baseline.isUseForTest !== false;
    return sections.map((section) => (
      section.tempId === activeSection.tempId
        ? { ...section, isUseForTest: baselineUseForTest }
        : section
    ));
  } catch {
    return sections;
  }
}

export function isPersistedQuestionLocked(question, persistedQuestionIds, coursePublished) {
  if (!coursePublished || !question?.tempId) return false;
  const ids = persistedQuestionIds instanceof Set
    ? persistedQuestionIds
    : new Set(persistedQuestionIds ?? []);
  return ids.has(question.tempId) && isFilledTestQuestion(question);
}

/** Câu hỏi đã có bản ghi trong DB (Question_Sections / Questions). */
export function isQuestionPersistedInDatabase(question) {
  const questionId = Number(question?.QuestionId);
  return Number.isFinite(questionId) && questionId > 0;
}

export function collectPersistedQuestionIds(sections = []) {
  const ids = new Set();
  (sections ?? []).forEach((section) => {
    getFilledTestQuestions(section?.Questions).forEach((question) => {
      if (question.tempId) ids.add(question.tempId);
    });
  });
  return ids;
}

export function buildQuestionContentSnapshot(question) {
  const payload = buildTestQuestionPayload(question);
  const { isActive: _isActive, isUseForTest: _isUseForTest, ...content } = payload;
  return JSON.stringify(content);
}

export function findInitialSectionQuestion(section, tempId) {
  if (!tempId) return null;
  return (section?.InitialQuestions ?? []).find((question) => question.tempId === tempId) ?? null;
}

/** So sánh nội dung câu (đề, choices, đáp án đúng) với bản ban đầu — không tính cờ sử dụng. */
export function isQuestionContentChangedFromInitial(question, initialQuestions = []) {
  if (!question?.tempId || !isFilledTestQuestion(question)) return false;
  const initial = initialQuestions.find((item) => item.tempId === question.tempId);
  if (!initial) return false;
  return buildQuestionContentSnapshot(question) !== buildQuestionContentSnapshot(initial);
}

/** Lưu bản Old Question vào danh sách đã xóa nếu câu đã bị sửa nội dung. */
export function buildDeletedQuestionArchive(question, initialQuestions = []) {
  const initial = initialQuestions.find((item) => item.tempId === question?.tempId);
  const hadContentChanges = Boolean(
    initial && isQuestionContentChangedFromInitial(question, initialQuestions),
  );

  if (!hadContentChanges || !initial) {
    return { question: { ...question }, hadContentChanges: false };
  }

  const [archivedInitial] = cloneSectionQuestions([initial]);

  return {
    question: {
      ...archivedInitial,
      tempId: question.tempId,
      QuestionId: question.QuestionId ?? initial.QuestionId,
    },
    hadContentChanges: true,
  };
}

export function buildQuestionBaselineMap(sections = []) {
  const map = new Map();
  (sections ?? []).forEach((section) => {
    getFilledTestQuestions(section?.Questions).forEach((question) => {
      if (!question.tempId) return;
      map.set(question.tempId, {
        snapshot: buildQuestionContentSnapshot(question),
        questionId: question.QuestionId ?? null,
      });
    });
  });
  return map;
}

export function buildQuestionSnapshotMap(sections = []) {
  const map = new Map();
  buildQuestionBaselineMap(sections).forEach((baseline, tempId) => {
    map.set(tempId, baseline.snapshot);
  });
  return map;
}

export function isQuestionDirty(question, baselineMap) {
  if (!question?.tempId || !isFilledTestQuestion(question)) return false;
  const baseline = baselineMap?.get(question.tempId);
  if (!baseline) return true;
  return buildQuestionContentSnapshot(question) !== baseline.snapshot;
}

/** tempId đã sửa / mới + QuestionId đã xóa so với baseline. */
export function collectQuestionChangeSet(sections = [], baselineMap = new Map()) {
  const dirtyTempIds = new Set();
  const deletedQuestionIds = [];

  (sections ?? []).forEach((section) => {
    getFilledTestQuestions(section?.Questions).forEach((question) => {
      if (isQuestionDirty(question, baselineMap)) {
        dirtyTempIds.add(question.tempId);
      }
    });
  });

  baselineMap.forEach((baseline, tempId) => {
    const stillExists = getAllQuestions(sections).some((question) => question.tempId === tempId);
    if (!stillExists && baseline.questionId) {
      deletedQuestionIds.push(baseline.questionId);
    }
  });

  return { dirtyTempIds, deletedQuestionIds };
}

export function validatePublishedQuestionBankIntegrity(sections, snapshotMap) {
  if (!snapshotMap?.size) return { ok: true };

  for (const [tempId, snapshot] of snapshotMap.entries()) {
    const current = getAllQuestions(sections).find((q) => q.tempId === tempId);
    if (!current) {
      return {
        ok: false,
        message: 'Không thể xóa câu hỏi khi khóa học đã xuất bản.',
      };
    }
    if (buildQuestionContentSnapshot(current) !== snapshot) {
      return {
        ok: false,
        message: 'Không thể sửa nội dung câu hỏi cũ khi khóa học đã xuất bản.',
      };
    }
  }

  return { ok: true };
}

function shuffleItems(items = []) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function shuffleTestQuestionOptions(question) {
  const normalized = normalizeTestQuestion(question);
  const options = normalized.Options ?? [];
  if (options.length < 2) return normalized;
  return { ...normalized, Options: shuffleItems(options) };
}

export function canShuffleTestQuestionOptions(question) {
  return (normalizeTestQuestion(question).Options ?? []).length >= 2;
}

export const SCORING_MODE_AUTO = 'AUTO';
export const SCORING_MODES = [SCORING_MODE_AUTO];

export const SCORING_MODE_LABELS = {
  [SCORING_MODE_AUTO]: 'Tự chia đều',
};

export const DEFAULT_TEST_TOTAL_SCORE = 100;

export const TEST_SOURCE_CHAPTER_QUIZ = 'CHAPTER_QUIZ';
export const TEST_SOURCE_COURSE_FINAL = 'COURSE_FINAL';

export function getDefaultFinalTestConfig() {
  return {
    totalQuestions: 30,
    listeningCount: 10,
    readingCount: 10,
    vocabularyCount: 10,
  };
}

export function getTestDefaultFields() {
  return {
    Description: '',
    MaterialUrl: '',
    TotalScore: DEFAULT_TEST_TOTAL_SCORE,
    ScoringMode: SCORING_MODE_AUTO,
    TestSource: TEST_SOURCE_CHAPTER_QUIZ,
    FinalTestConfig: getDefaultFinalTestConfig(),
    QuestionBankId: null,
    QuestionBankTitle: null,
    QuestionBankScope: null,
    Sections: [],
  };
}

export function inferTestSource({ testSource } = {}) {
  return testSource === TEST_SOURCE_COURSE_FINAL ? TEST_SOURCE_COURSE_FINAL : TEST_SOURCE_CHAPTER_QUIZ;
}

export function getFinalTestConfigTotal(config = {}) {
  return (
    Number(config.listeningCount ?? 0) +
    Number(config.readingCount ?? 0) +
    Number(config.vocabularyCount ?? config.writingCount ?? 0)
  );
}

export function validateFinalTestConfig(config = {}, stats = null) {
  const errors = {};
  const listening = Number(config.listeningCount ?? 0);
  const reading = Number(config.readingCount ?? 0);
  const vocabulary = Number(config.vocabularyCount ?? config.writingCount ?? 0);
  const total = getFinalTestConfigTotal(config);

  if (!Number.isFinite(total) || total <= 0) {
    errors._total = 'Vui lòng cấu hình ít nhất 1 câu hỏi cho bài kiểm tra cuối khóa';
    return errors;
  }

  [listening, reading, vocabulary].forEach((value, index) => {
    const labels = ['Nghe', 'Đọc', 'Từ vựng / Ngữ pháp'];
    if (!Number.isFinite(value) || value < 0) {
      errors[`skill_${index}`] = `Số câu ${labels[index]} không hợp lệ`;
    }
  });

  if (stats?.questionCountBySkill) {
    if (listening > (stats.questionCountBySkill[TEST_SKILL_LISTENING] ?? 0)) {
      errors.listeningCount = 'Không đủ câu hỏi Nghe trong các bank chương';
    }
    if (reading > (stats.questionCountBySkill[TEST_SKILL_READING] ?? 0)) {
      errors.readingCount = 'Không đủ câu hỏi Đọc trong các bank chương';
    }
    if (vocabulary > (stats.questionCountBySkill[TEST_SKILL_VOCABULARY] ?? stats.questionCountBySkill.WRITING ?? 0)) {
      errors.vocabularyCount = 'Không đủ câu hỏi Từ vựng / Ngữ pháp trong các bank chương';
    }
    if ((stats.chapterBankCount ?? 0) === 0) {
      errors._banks = 'Khóa học chưa có ngân hàng câu hỏi theo chương';
    }
  }

  return errors;
}

export function getEffectiveScoringMode(material) {
  void material;
  return SCORING_MODE_AUTO;
}

export function getAllQuestions(sections = []) {
  return sections.flatMap((section) => section.Questions ?? []);
}

export function getQuestionCount(sections = []) {
  return getAllQuestions(sections).length;
}

export function isFilledTestQuestion(question) {
  return Boolean(String(question?.QuestionText ?? '').trim());
}

export function getFilledTestQuestions(questions = []) {
  return (questions ?? []).filter(isFilledTestQuestion);
}

export function getSectionDeletedQuestions(section) {
  return section?.DeletedQuestions ?? [];
}

/** Có câu hỏi đã lưu DB đang chờ xóa khi cập nhật section. */
export function hasPendingPersistedQuestionDeletes(section) {
  return (section?.DeletedQuestions ?? []).some((item) => item?.QuestionId);
}

export function cloneSectionQuestions(questions = []) {
  return (questions ?? []).map((question) => ({
    ...question,
    Options: (question.Options ?? []).map((option) => ({ ...option })),
  }));
}

export function attachInitialQuestionsToSection(section) {
  if (!section) return section;
  return {
    ...section,
    InitialQuestions: cloneSectionQuestions(section.Questions ?? []),
  };
}

/** Khôi phục danh sách câu hỏi về trạng thái ban đầu khi đã restore hết câu đã xóa. */
export function finalizeSectionAfterFullQuestionRestore(section) {
  if (!section?.InitialQuestions) return section;
  if ((section.DeletedQuestions ?? []).length > 0) return section;

  return {
    ...section,
    Questions: cloneSectionQuestions(section.InitialQuestions),
    DeletedQuestions: [],
  };
}

/** Khôi phục một câu hỏi về bản Old Question ban đầu. */
export function restoreQuestionFromInitial(currentQuestion, initialQuestion) {
  if (!currentQuestion?.tempId || !initialQuestion) return currentQuestion;

  const [cloned] = cloneSectionQuestions([initialQuestion]);

  return {
    ...cloned,
    tempId: currentQuestion.tempId,
    QuestionId: currentQuestion.QuestionId ?? initialQuestion.QuestionId,
  };
}

export function appendDeletedQuestionToSection(
  deletedQuestions = [],
  question,
  originalIndex = 0,
  initialQuestions = [],
) {
  if (!question?.tempId) return deletedQuestions;

  // Câu mới chưa từng lưu DB: xóa hẳn, không đưa vào danh sách đã xóa.
  const isPersisted = Boolean(question.QuestionId);
  const wasInInitial = (initialQuestions ?? []).some((item) => item.tempId === question.tempId);
  if (!isPersisted && !wasInInitial) {
    return deletedQuestions;
  }

  const hasContent =
    Boolean(question.QuestionId) || Boolean(String(question.QuestionText ?? '').trim());
  if (!hasContent) return deletedQuestions;

  if (deletedQuestions.some((item) => item.tempId === question.tempId)) {
    return deletedQuestions;
  }

  const safeIndex = Number.isInteger(originalIndex) && originalIndex >= 0 ? originalIndex : 0;
  const { question: archivedQuestion, hadContentChanges } = buildDeletedQuestionArchive(
    question,
    initialQuestions,
  );

  return [
    ...deletedQuestions,
    {
      ...archivedQuestion,
      deletedAt: new Date().toISOString(),
      deletedOrder: safeIndex,
      hadContentChanges,
    },
  ];
}

export function restoreDeletedQuestionToSection(section, question) {
  if (!section || !question?.tempId) return section;

  const deletedQuestions = (section.DeletedQuestions ?? []).filter(
    (item) => item.tempId !== question.tempId,
  );
  const questions = section.Questions ?? [];

  if (questions.some((item) => item.tempId === question.tempId)) {
    return { ...section, DeletedQuestions: deletedQuestions };
  }

  const {
    deletedAt: _deletedAt,
    deletedOrder,
    hadContentChanges: _hadContentChanges,
    ...restoredQuestion
  } = question;

  const insertIndex = Math.min(
    Number.isInteger(deletedOrder) && deletedOrder >= 0 ? deletedOrder : questions.length,
    questions.length,
  );

  const nextQuestions = [...questions];
  nextQuestions.splice(insertIndex, 0, restoredQuestion);

  return {
    ...section,
    Questions: nextQuestions,
    DeletedQuestions: deletedQuestions,
  };
}

export function getActiveFilledTestQuestions(questions = []) {
  return getFilledTestQuestions(questions).filter(isQuestionActive);
}

export function getActiveQuestionCount(sections = []) {
  return sections.reduce(
    (sum, section) => sum + getActiveFilledTestQuestions(section?.Questions).length,
    0,
  );
}

export function countActiveQuestionsBySkill(sections = []) {
  return {
    [TEST_SKILL_LISTENING]: getSectionsBySkill(sections, TEST_SKILL_LISTENING).reduce(
      (sum, section) => sum + getActiveFilledTestQuestions(section?.Questions).length,
      0,
    ),
    [TEST_SKILL_READING]: getSectionsBySkill(sections, TEST_SKILL_READING).reduce(
      (sum, section) => sum + getActiveFilledTestQuestions(section?.Questions).length,
      0,
    ),
    [TEST_SKILL_VOCABULARY]: getSectionsBySkill(sections, TEST_SKILL_VOCABULARY).reduce(
      (sum, section) => sum + getActiveFilledTestQuestions(section?.Questions).length,
      0,
    ),
  };
}

export function getFilledQuestionCount(sections = []) {
  return sections.reduce(
    (sum, section) => sum + getFilledTestQuestions(section.Questions).length,
    0,
  );
}

export function formatScoreValue(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return '0';
  const rounded = Math.round(score * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function calculateManualTotalScore(sections = []) {
  return getQuestionCount(sections);
}

export function calculateSectionManualScore(section) {
  return (section?.Questions ?? []).length;
}

export function calculateAutoQuestionScore(totalScore, questionCount) {
  const total = Number(totalScore);
  const count = Number(questionCount);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return Math.round((total / count) * 100) / 100;
}

export function applyAutoScoresToQuestions(sections = [], totalScore) {
  const questionCount = getQuestionCount(sections);
  const perQuestion = calculateAutoQuestionScore(totalScore, questionCount);

  return sections.map((section) => ({
    ...section,
    Questions: (section.Questions ?? []).map((question) => ({
      ...question,
      Score: perQuestion,
    })),
  }));
}

export function scoresMatch(target, actual, epsilon = 0.01) {
  return Math.abs(Number(target) - Number(actual)) <= epsilon;
}

export function getSectionScoreLabel(section, scoringMode, totalScore, questionCountAll) {
  void scoringMode;
  const count = (section?.Questions ?? []).length;
  if (count === 0) return '0 câu';
  const perQuestion = calculateAutoQuestionScore(totalScore, questionCountAll);
  const sectionScore = Math.round(perQuestion * count * 100) / 100;
  return `${count} câu · khoảng ${formatScoreValue(sectionScore)} điểm`;
}

export function createEmptyTestSection(skillType = TEST_SKILL_READING) {
  return {
    tempId: createTestTempId('section'),
    SectionTitle: '',
    DisplayName: '',
    SkillType: skillType,
    typeId: mapSkillTypeToTypeId(skillType),
    Description: '',
    isUseForTest: true,
    Questions: [],
    ...(skillType === TEST_SKILL_LISTENING ? getListeningSectionFields() : {}),
    ...(skillType === TEST_SKILL_READING ? getReadingSectionFields() : {}),
  };
}

/** Ba bài mặc định (mỗi kỹ năng một bài) cho ngân hàng câu hỏi. */
export function createQuestionBankSkillSections() {
  return TEST_SKILLS.map((skill) => createEmptyTestSection(skill));
}

/** Giữ dữ liệu bank hiện có, bổ sung bài trống cho kỹ năng còn thiếu. */
export function ensureQuestionBankSkillSections(sections = []) {
  const persistedSections = getNonEmptyQuestionBankSections(sections);
  return TEST_SKILLS.flatMap((skill) => {
    const skillSections = getSectionsBySkill(persistedSections, skill);
    return skillSections.length > 0 ? skillSections : [createEmptyTestSection(skill)];
  });
}

export function getSectionsBySkill(sections = [], skillType) {
  const target = normalizeQuestionBankSkillType(skillType);
  return sections.filter(
    (section) =>
      normalizeQuestionBankSkillType(section.SkillType, section.typeId ?? section.TypeId) === target,
  );
}

export function getVisibleSectionsBySkill(sections = [], skillType) {
  return getSectionsBySkill(sections, skillType)
    .sort((a, b) => (Number(a.sectionOrder) || 0) - (Number(b.sectionOrder) || 0));
}

export function getSectionBySkill(sections = [], skillType) {
  return getSectionsBySkill(sections, skillType)[0] ?? null;
}

export function getSectionBaiNumber(section, sections = []) {
  if (!section) return 1;
  const skillSections = getVisibleSectionsBySkill(sections, section.SkillType);
  const index = skillSections.findIndex(
    (item) =>
      item.tempId === section.tempId
      || Number(item.SectionId) === Number(section.SectionId),
  );
  return index >= 0 ? index + 1 : skillSections.length + 1;
}

/** Order lưu DB — ưu tiên sectionOrder hiện có, section mới lấy max + 1 trong cùng kỹ năng. */
export function resolveSectionOrderForSave(section, sections = []) {
  if (!section) return 1;

  const parsedOrder = Number(section.sectionOrder);
  if (section.SectionId && Number.isInteger(parsedOrder) && parsedOrder > 0) {
    return parsedOrder;
  }

  const skillSections = getSectionsBySkill(sections, section.SkillType);
  const maxOrder = skillSections
    .filter((item) => item.tempId !== section.tempId)
    .reduce((max, item) => Math.max(max, Number(item.sectionOrder) || 0), 0);

  if (Number.isInteger(parsedOrder) && parsedOrder > 0) {
    return parsedOrder;
  }

  return maxOrder + 1;
}

export function getQuestionBankSectionNameFallback(section, sections = []) {
  const index = getSectionBaiNumber(section, sections);
  if (normalizeQuestionBankSkillType(section?.SkillType) === TEST_SKILL_VOCABULARY) {
    return `Nhóm ${index}`;
  }
  return `Bài số ${index}`;
}

export function getQuestionBankSectionNamePlaceholder(section) {
  if (normalizeQuestionBankSkillType(section?.SkillType) === TEST_SKILL_VOCABULARY) {
    return 'Chưa có tên nhóm';
  }
  return 'Chưa có tên bài';
}

/** Nghe / Đọc / Từ vựng–Ngữ pháp đều có thể có nhiều bài hoặc nhóm. */
export function supportsQuestionBankMultiSection(_skillType) {
  return true;
}

/** Gộp mọi section Từ vựng–Ngữ pháp thành một (migrate data cũ có nhiều nhóm). */
export function consolidateVocabularySections(sections = []) {
  const vocabularySections = getSectionsBySkill(sections, TEST_SKILL_VOCABULARY);
  if (vocabularySections.length <= 1) return sections;

  const mergedQuestions = vocabularySections.flatMap((section) => section.Questions ?? []);
  const primary = {
    ...vocabularySections[0],
    Questions: mergedQuestions,
    DisplayName: '',
    SectionTitle: '',
    Description: '',
  };

  let merged = false;
  return sections.reduce((acc, section) => {
    if (normalizeQuestionBankSkillType(section.SkillType) !== TEST_SKILL_VOCABULARY) {
      acc.push(section);
      return acc;
    }
    if (!merged) {
      acc.push(primary);
      merged = true;
    }
    return acc;
  }, []);
}

/** @deprecated */
export const consolidateWritingSections = consolidateVocabularySections;

/** @deprecated use getQuestionBankSectionNameFallback — kept for imports */
export function getQuestionBankSectionDisplayTitle(section, sections = []) {
  const name = String(section?.DisplayName ?? '').trim();
  if (name) return name;
  return getQuestionBankSectionNameFallback(section, sections);
}

export function getQuestionBankSectionTabLabel(section, sections = []) {
  const title = String(section?.SectionTitle ?? '').trim();
  if (title) return title;
  const name = String(section?.DisplayName ?? '').trim();
  if (name) return name;
  return getQuestionBankSectionNameFallback(section, sections);
}

export function isQuestionBankVocabularySkill(skillType) {
  return normalizeQuestionBankSkillType(skillType) === TEST_SKILL_VOCABULARY;
}

/** @deprecated */
export const isQuestionBankWritingSkill = isQuestionBankVocabularySkill;

export function createQuestionBankSection(skillType = TEST_SKILL_READING) {
  return createEmptyTestSection(skillType);
}

export function getNonEmptyQuestionBankSections(sections = []) {
  return sections
    .map((section) => ({
      ...section,
      Questions: getFilledTestQuestions(section.Questions),
    }))
    .filter(
      (section) =>
        section.Questions.length > 0
        || Number(section.questionCount) > 0
        || Boolean(section.SectionId),
    );
}

/** Trim SectionName trước khi gửi API — giữ nguyên space ở Title khi đang nhập trên form. */
export function normalizeQuestionBankSectionForSave(section) {
  const next = {
    ...section,
    DisplayName: String(section.DisplayName ?? '').trim(),
    SectionTitle: String(section.SectionTitle ?? ''),
    Description: String(section.Description ?? '').trim(),
  };
  if (section.SkillType === TEST_SKILL_LISTENING) {
    next.AudioUrl = String(section.AudioUrl ?? '').trim();
  }
  return next;
}

/** Chuỗi so sánh khi check trùng (đề câu, đáp án, tên section): trim + lower tiếng Việt. */
function qbTextKey(text) {
  return String(text ?? '').trim().toLocaleLowerCase('vi-VN');
}

/** Title đề section để so với section khác trong chương (Vocab dùng DisplayName nếu không có SectionTitle). */
function qbSectionTitleKey(section) {
  const fromTitle = String(section?.SectionTitle ?? '').trim();
  if (fromTitle) return qbTextKey(fromTitle);
  if (section?.SkillType === TEST_SKILL_VOCABULARY) {
    return qbTextKey(section?.DisplayName);
  }
  return '';
}

/**
 * Kiểm tra trùng đề câu hỏi và trùng lựa chọn trong danh sách câu.
 *
 * @param {{ id: string, title: string, choices?: string[] }[]} questions
 * @returns {{ questionId: string, questionNumber: number, kind: 'title'|'choice', message: string }[]}
 *
 * - Trùng title: so sánh title đã chuẩn hóa (trim + lower vi-VN) giữa các câu trong list.
 * - Trùng choice: trong cùng một câu, hai lựa chọn có nội dung chuẩn hóa giống nhau.
 * - Đề/đáp án rỗng sau chuẩn hóa không tham gia so trùng.
 */
export function checkDuplicateQuestions(questions = []) {
  const normalized = (questions ?? []).map((item, index) => ({
    id: String(item?.id ?? index),
    questionNumber: index + 1,
    title: String(item?.title ?? ''),
    choices: (item?.choices ?? []).map((choice) => String(choice ?? '')),
  }));

  const errors = [];

  const titleBuckets = new Map();
  for (const question of normalized) {
    const key = qbTextKey(question.title);
    if (!key) continue;
    if (!titleBuckets.has(key)) titleBuckets.set(key, []);
    titleBuckets.get(key).push(question);
  }

  for (const group of titleBuckets.values()) {
    if (group.length < 2) continue;
    for (const question of group) {
      const otherNumbers = group
        .filter((item) => item.id !== question.id)
        .map((item) => item.questionNumber);
      if (otherNumbers.length === 0) continue;
      errors.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        kind: 'title',
        message: `Câu ${question.questionNumber} trùng đề với câu ${otherNumbers.join(', ')}`,
      });
    }
  }

  for (const question of normalized) {
    const choiceBuckets = new Map();
    question.choices.forEach((text, choiceIndex) => {
      const key = qbTextKey(text);
      if (!key) return;
      if (!choiceBuckets.has(key)) choiceBuckets.set(key, []);
      choiceBuckets.get(key).push(choiceIndex);
    });

    for (const indexes of choiceBuckets.values()) {
      if (indexes.length < 2) continue;
      const choiceNums = indexes.map((i) => i + 1);
      errors.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        kind: 'choice',
        choiceIndexes: indexes,
        message: `Câu ${question.questionNumber}: lựa chọn ${choiceNums.join(', ')} trùng nhau`,
      });
    }
  }

  return errors;
}

/** Map câu hỏi section (QuestionText, Options) → input của checkDuplicateQuestions. */
export function toDuplicateCheckQuestions(sectionQuestions = []) {
  return (sectionQuestions ?? []).map((question, index) => ({
    id: String(question?.tempId ?? question?.QuestionId ?? index),
    title: String(question?.QuestionText ?? ''),
    choices: (question?.Options ?? []).map((option) => String(option?.OptionText ?? '')),
  }));
}

/** Gắn kết quả checkDuplicateQuestions lên shape lỗi form (QuestionText / Options). */
function mapDuplicateErrorsToQuestionFields(duplicateErrors, sectionQuestions = []) {
  const questionById = new Map(
    (sectionQuestions ?? []).map((question) => [String(question.tempId), question]),
  );
  const questionErrors = {};

  for (const entry of duplicateErrors) {
    if (entry.kind === 'title') {
      questionErrors[entry.questionId] = {
        ...(questionErrors[entry.questionId] ?? {}),
        QuestionText: entry.message,
      };
      continue;
    }

    if (entry.kind === 'choice') {
      const source = questionById.get(entry.questionId);
      const options = source?.Options ?? [];
      const optionErrors = { ...(questionErrors[entry.questionId]?.Options ?? {}) };
      (entry.choiceIndexes ?? []).forEach((choiceIndex) => {
        const option = options[choiceIndex];
        if (!option?.tempId) return;
        optionErrors[option.tempId] = { OptionText: QUESTION_BANK_DUPLICATE_OPTION_ERROR };
      });
      questionErrors[entry.questionId] = {
        ...(questionErrors[entry.questionId] ?? {}),
        Options: optionErrors,
      };
    }
  }

  return questionErrors;
}

/** Lỗi trùng DisplayName hoặc title section với section khác trong chương. */
function collectDuplicateSectionNameErrors(section, allSections) {
  const errors = {};
  const myName = qbTextKey(section?.DisplayName);
  const myTitle = qbSectionTitleKey(section);

  for (const other of allSections ?? []) {
    if (!other?.tempId || other.tempId === section?.tempId) continue;
    if (myName && myName === qbTextKey(other.DisplayName)) {
      errors.DisplayName = 'Section name đã tồn tại trong chương này';
    }
    if (myTitle && myTitle === qbSectionTitleKey(other)) {
      errors.SectionTitle = 'Title (đề bài) đã tồn tại trong chương này';
    }
  }

  return errors;
}

function formatQuestionBankMissingAnswersToast(section, errors = {}) {
  const indexes = [];

  (section?.Questions ?? []).forEach((question, index) => {
    const qErrors = errors?.Questions?.[question.tempId];
    if (!qErrors) return;
    if (qErrors._options || (qErrors.Options && Object.keys(qErrors.Options).length > 0)) {
      const onlyDuplicateChoices = Object.values(qErrors.Options ?? {}).length > 0
        && Object.values(qErrors.Options ?? {}).every(
          (optionError) => optionError?.OptionText === QUESTION_BANK_DUPLICATE_OPTION_ERROR,
        )
        && !qErrors._options;
      if (onlyDuplicateChoices) return;
      indexes.push(index + 1);
    }
  });

  if (indexes.length === 0) return null;
  return `Câu chưa có đáp án — Câu ${indexes.join(', ')}`;
}

function formatQuestionBankDuplicateOptionsToast(section, errors = {}) {
  const parts = [];

  (section?.Questions ?? []).forEach((question, index) => {
    const qErrors = errors?.Questions?.[question.tempId];
    if (!qErrors) return;
    const hasDuplicate = Object.values(qErrors.Options ?? {}).some(
      (optionError) => optionError?.OptionText === QUESTION_BANK_DUPLICATE_OPTION_ERROR,
    );
    if (hasDuplicate) {
      parts.push(`Câu ${index + 1} có lựa chọn trùng nhau`);
    }
  });

  if (parts.length === 0) return null;
  return parts.join(' · ');
}

function formatQuestionBankDuplicateQuestionsToast(section) {
  const duplicateErrors = checkDuplicateQuestions(toDuplicateCheckQuestions(section?.Questions));
  const titleMessages = duplicateErrors
    .filter((entry) => entry.kind === 'title')
    .map((entry) => entry.message);
  if (titleMessages.length === 0) return null;
  return `Câu hỏi trùng đề bài — ${titleMessages.join(' · ')}`;
}

function formatQuestionBankMissingCorrectToast(section, errors = {}) {
  const indexes = [];

  (section?.Questions ?? []).forEach((question, index) => {
    const qErrors = errors?.Questions?.[question.tempId];
    if (qErrors?._correctOption) {
      indexes.push(index + 1);
    }
  });

  if (indexes.length === 0) return null;
  return `Câu chưa có đáp án đúng — Câu ${indexes.join(', ')}`;
}

function collectQuestionBankQuestionTextToasts(section, errors = {}) {
  const messages = [];

  (section?.Questions ?? []).forEach((question) => {
    const qErrors = errors?.Questions?.[question.tempId];
    if (!qErrors?.QuestionText || /trùng đề|bị trùng/i.test(String(qErrors.QuestionText))) return;
    messages.push(qErrors.QuestionText);
  });

  return messages;
}

export function getSectionDisplayTitle(section) {
  const title = String(section?.SectionTitle ?? '').trim();
  if (title) return title;
  const skillLabel = TEST_SKILL_LABELS[section?.SkillType];
  return skillLabel ? `Phần ${skillLabel}` : 'Phần kiểm tra';
}

export function createDefaultMultipleChoiceOptions() {
  return ['A', 'B', 'C', 'D'].map((label, index) => ({
    tempId: createTestTempId('option'),
    OptionText: '',
    IsCorrect: index === 0,
  }));
}

export function createEmptyTestQuestion(context = {}) {
  const skillType = context.SkillType ?? context.skillType ?? null;

  return {
    tempId: createTestTempId('question'),
    SkillType: skillType,
    QuestionText: '',
    Score: 1,
    isActive: true,
    isUseForTest: true,
    Options: createDefaultMultipleChoiceOptions(),
  };
}

export function computeTestSummary(questions = []) {
  const count = questions.length;
  const totalScore = questions.reduce((sum, question) => {
    const score = Number(question.Score);
    return sum + (Number.isFinite(score) && score > 0 ? score : 0);
  }, 0);
  return { count, totalScore };
}

export function computeMaterialTestSummary(sections = []) {
  return sections.reduce(
    (acc, section) => {
      const { count, totalScore } = computeTestSummary(section.Questions ?? []);
      return {
        sectionCount: acc.sectionCount + 1,
        questionCount: acc.questionCount + count,
        totalScore: acc.totalScore + totalScore,
      };
    },
    { sectionCount: 0, questionCount: 0, totalScore: 0 },
  );
}

export function validateTestQuestion(question, { validateScore = true } = {}) {
  void validateScore;
  const normalized = normalizeTestQuestion(question);
  const qErrors = {};
  const questionText = String(normalized.QuestionText ?? '').trim();

  if (!questionText) {
    qErrors.QuestionText = 'Vui lòng nhập nội dung câu hỏi';
  } else if (questionText.length < TEST_QUESTION_TEXT_MIN) {
    qErrors.QuestionText = `Đề bài câu hỏi phải có ít nhất ${TEST_QUESTION_TEXT_MIN} ký tự`;
  } else if (questionText.length > TEST_QUESTION_TEXT_MAX) {
    qErrors.QuestionText = `Tối đa ${TEST_QUESTION_TEXT_MAX} ký tự`;
  }

  const options = normalized.Options ?? [];
  if (options.length < 2) {
    qErrors._options = 'Mỗi câu hỏi phải có tối thiểu 2 đáp án';
  }
  const optionErrors = {};
  options.forEach((option) => {
    const optionText = String(option.OptionText ?? '').trim();
    if (!optionText) {
      optionErrors[option.tempId] = { OptionText: 'Vui lòng nhập nội dung đáp án' };
    } else if (optionText.length > TEST_QUESTION_OPTION_TEXT_MAX) {
      optionErrors[option.tempId] = {
        OptionText: `Tối đa ${TEST_QUESTION_OPTION_TEXT_MAX} ký tự`,
      };
    }
  });

  if (Object.keys(optionErrors).length > 0) {
    qErrors.Options = optionErrors;
  }
  const correctCount = options.filter((option) => option.IsCorrect).length;

  if (options.length >= 2 && correctCount < 1) {
    qErrors._correctOption = 'Mỗi câu hỏi phải có ít nhất 1 đáp án đúng (có thể chọn nhiều)';
  }

  return qErrors;
}

export function validateTestMaterial(material, options = {}) {
  const materialErrors = {};
  const { courseId, inlineSections = false, skipTitle = false, bankStats = null } = options;

  if (!skipTitle && !String(material.Title ?? '').trim()) {
    materialErrors.Title = 'Vui lòng nhập tiêu đề bài kiểm tra';
  }

  const testSource = inferTestSource({ testSource: material.TestSource });

  const sections = material.Sections ?? [];

  if (inlineSections) {
    const filledSections = getNonEmptyQuestionBankSections(sections);
    if (filledSections.length === 0) {
      materialErrors._sections = 'Vui lòng thêm ít nhất 1 câu hỏi';
      return materialErrors;
    }
  } else if (!courseId) {
    return materialErrors;
  } else if (testSource === TEST_SOURCE_COURSE_FINAL) {
    const configErrors = validateFinalTestConfig(material.FinalTestConfig ?? {}, bankStats);
    if (Object.keys(configErrors).length > 0) {
      materialErrors.FinalTestConfig = configErrors;
      if (configErrors._total) materialErrors._sections = configErrors._total;
      if (configErrors._banks) materialErrors._sections = configErrors._banks;
    }
    return materialErrors;
  } else if (!material.QuestionBankId) {
    materialErrors.QuestionBankId = 'Chương này chưa có ngân hàng câu hỏi';
    return materialErrors;
  } else if (sections.length === 0) {
    materialErrors._sections = 'Ngân hàng câu hỏi chương chưa có câu hỏi';
    return materialErrors;
  }

  const sectionErrors = {};
  const sectionsToValidate = inlineSections ? getNonEmptyQuestionBankSections(sections) : sections;

  sectionsToValidate.forEach((section) => {
    const sErrors = {};

    if (!TEST_SKILLS.includes(section.SkillType)) {
      sErrors.SkillType = 'Vui lòng chọn kỹ năng cho phần kiểm tra';
    }

    const questions = section.Questions ?? [];
    if (questions.length === 0) {
      sErrors._questions = 'Vui lòng thêm câu hỏi cho phần này';
    }

    if (section.SkillType === TEST_SKILL_LISTENING) {
      Object.assign(sErrors, validateQuestionBankListeningSource(section));
    }

    if (section.SkillType === TEST_SKILL_READING) {
      const sourceType =
        section.ReadingSourceType === READING_SOURCE_UPLOAD
          ? READING_SOURCE_UPLOAD
          : READING_SOURCE_COMPOSE;

      if (sourceType === READING_SOURCE_UPLOAD) {
        const materialUrl = String(section.MaterialUrl ?? '').trim();
        const hasUploaded = Boolean(materialUrl);
        const hasPendingFile = isBrowserFile(section.File);
        const hasFileMeta = Boolean(section.FileName);

        if (!hasUploaded && !hasPendingFile && !hasFileMeta) {
          sErrors.File = 'Vui lòng tải file PDF, DOC hoặc DOCX.';
        } else if (hasPendingFile) {
          const fileCheck = validateReadingDocFile(section.File);
          if (!fileCheck.ok) {
            sErrors.File = fileCheck.message;
          }
        } else if (hasFileMeta) {
          const ext = getListeningAudioExtension(section.FileName);
          if (!isAllowedReadingDocExtension(ext)) {
            sErrors.File = READING_DOC_INVALID_TYPE_MESSAGE;
          } else if (Number(section.FileSize) > MATERIAL_UPLOAD_MAX_BYTES) {
            sErrors.File = MATERIAL_UPLOAD_MAX_SIZE_MESSAGE;
          }
        }
      } else {
        Object.assign(sErrors, validateQuestionBankReadingComposeSource(section));
      }
    }

    const questionErrors = {};
    questions.forEach((question) => {
      if (!isFilledTestQuestion(question)) return;
      const qErrors = validateTestQuestion(question);
      if (Object.keys(qErrors).length > 0) {
        questionErrors[question.tempId] = qErrors;
      }
    });

    if (Object.keys(questionErrors).length > 0) {
      sErrors.Questions = questionErrors;
    }

    if (Object.keys(sErrors).length > 0) {
      sectionErrors[section.tempId] = sErrors;
    }
  });

  if (Object.keys(sectionErrors).length > 0) {
    materialErrors.Sections = sectionErrors;
  }

  return materialErrors;
}

/** Validate một section question bank (dùng trước khi cập nhật từng section). Mục lục: đầu file + docs/QUESTION_BANK_VALIDATION_DEFENSE.md */
export function validateQuestionBankSection(
  section,
  { validateScore = false, requireQuestions = false, forSave = false, allSections = [] } = {},
) {
  void validateScore;
  const sErrors = {};

  if (!section?.tempId) {
    return { _section: 'Section không hợp lệ' };
  }

  if (!TEST_SKILLS.includes(section.SkillType)) {
    sErrors.SkillType = 'Vui lòng chọn kỹ năng cho phần kiểm tra';
  }

  if (forSave) {
    if (!String(section.DisplayName ?? '').trim()) {
      sErrors.DisplayName = 'Vui lòng nhập Section name';
    }

    const sectionTitle = String(section.SectionTitle ?? '').trim()
      || (section.SkillType === TEST_SKILL_VOCABULARY
        ? String(section.DisplayName ?? '').trim()
        : '');
    if (!sectionTitle) {
      sErrors.SectionTitle = 'Vui lòng nhập Title (đề bài)';
    }

    Object.assign(sErrors, collectDuplicateSectionNameErrors(section, allSections));
  }

  const questions = section.Questions ?? [];
  if ((forSave || requireQuestions) && questions.length === 0) {
    sErrors._questions = 'Section phải có ít nhất 1 câu hỏi';
  }

  if (forSave && section.SkillType === TEST_SKILL_LISTENING) {
    Object.assign(sErrors, validateQuestionBankListeningSource(section));
  }

  if (forSave && section.SkillType === TEST_SKILL_READING) {
    Object.assign(sErrors, validateQuestionBankReadingComposeSource(section));
  }

  if (forSave) {
    Object.assign(sErrors, validateSectionUseForTestRule(section));
  }

  const questionErrors = {};
  const questionsToValidate = forSave ? questions : questions.filter(isFilledTestQuestion);
  questionsToValidate.forEach((question) => {
    const qErrors = validateTestQuestion(question);
    if (Object.keys(qErrors).length > 0) {
      questionErrors[question.tempId] = qErrors;
    }
  });

  if (forSave) {
    const duplicateList = checkDuplicateQuestions(toDuplicateCheckQuestions(questions));
    const duplicateQuestionErrors = mapDuplicateErrorsToQuestionFields(duplicateList, questions);
    Object.entries(duplicateQuestionErrors).forEach(([tempId, qErrors]) => {
      questionErrors[tempId] = {
        ...(questionErrors[tempId] ?? {}),
        ...qErrors,
      };
    });
  }

  if (Object.keys(questionErrors).length > 0) {
    sErrors.Questions = questionErrors;
  }

  return sErrors;
}

export function isQuestionBankSectionValid(section) {
  if (!section?.tempId) return false;
  const errors = validateQuestionBankSection(normalizeQuestionBankSectionForSave(section), {
    forSave: true,
  });
  return Object.keys(errors).length === 0;
}

export function getQuestionBankSectionValidationToasts(errors = {}, section = null) {
  const messages = [];

  // Thứ tự khớp validateQuestionBankSection()
  if (errors._section) messages.push(errors._section);
  if (errors.SkillType) messages.push(errors.SkillType);
  if (errors.DisplayName) messages.push(errors.DisplayName);
  if (errors.SectionTitle) messages.push(errors.SectionTitle);
  if (errors._questions) messages.push(errors._questions);
  if (errors.isUseForTest) messages.push(errors.isUseForTest);
  if (errors._audio) messages.push(errors._audio);
  if (errors.File) messages.push(errors.File);
  if (errors.AudioUrl) messages.push(errors.AudioUrl);
  if (errors.Description) messages.push(errors.Description);

  messages.push(...collectQuestionBankQuestionTextToasts(section, errors));

  const missingAnswersToast = formatQuestionBankMissingAnswersToast(section, errors);
  if (missingAnswersToast) messages.push(missingAnswersToast);

  const duplicateOptionsToast = formatQuestionBankDuplicateOptionsToast(section, errors);
  if (duplicateOptionsToast) messages.push(duplicateOptionsToast);

  const duplicateToast = formatQuestionBankDuplicateQuestionsToast(section);
  if (duplicateToast) messages.push(duplicateToast);

  const missingCorrectToast = formatQuestionBankMissingCorrectToast(section, errors);
  if (missingCorrectToast) messages.push(missingCorrectToast);

  return messages.filter(Boolean);
}

/** Toast lỗi đầu tiên theo thứ tự validate — mỗi lần lưu chỉ hiện một lỗi. */
export function getQuestionBankSectionValidationToast(errors = {}, section = null) {
  const toasts = getQuestionBankSectionValidationToasts(errors, section);
  return toasts[0] ?? null;
}

export function getQuestionBankSectionValidationSummary(errors = {}, section = null) {
  return getQuestionBankSectionValidationToast(errors, section)
    ?? 'Vui lòng kiểm tra lại thông tin section.';
}

export const QUESTION_BANK_SAVE_WARNINGS = {
  MISSING_QUESTION_TITLE: 'Hãy thêm đề bài để tiếp tục',
  LISTENING_MISSING_AUDIO: 'Hãy thêm file nghe để tiếp tục',
  READING_MISSING_PROMPT: 'Hãy thêm đề bài để tiếp tục',
};

/** Kiểm tra section trước khi lưu — trả về cảnh báo đầu tiên nếu thiếu dữ liệu bắt buộc. */
export function findQuestionBankSectionSaveIssue(section, allSections = []) {
  if (!section?.tempId) {
    return { message: 'Section không hợp lệ' };
  }

  const errors = validateQuestionBankSection(normalizeQuestionBankSectionForSave(section), {
    forSave: true,
    allSections,
  });
  if (Object.keys(errors).length === 0) return null;

  if (errors.DisplayName) {
    return {
      message: errors.DisplayName,
      sectionTempId: section.tempId,
      field: 'DisplayName',
    };
  }

  if (errors.SectionTitle) {
    return {
      message: errors.SectionTitle,
      sectionTempId: section.tempId,
      field: 'SectionTitle',
    };
  }

  if (errors._questions) {
    return {
      message: errors._questions,
      sectionTempId: section.tempId,
    };
  }

  if (errors.isUseForTest) {
    return {
      message: errors.isUseForTest,
      sectionTempId: section.tempId,
      field: 'isUseForTest',
    };
  }

  const validationToasts = getQuestionBankSectionValidationToasts(errors, section);
  if (validationToasts.length > 0) {
    const questionTempId = Object.keys(errors.Questions ?? {})[0] ?? null;
    return {
      message: validationToasts[0],
      sectionTempId: section.tempId,
      ...(questionTempId ? { questionTempId } : {}),
    };
  }

  return {
    message: getQuestionBankSectionValidationSummary(errors, section),
    sectionTempId: section.tempId,
  };
}

/** Kiểm tra toàn bộ sections — dùng khi cần validate cả workspace. */
export function findQuestionBankSaveValidationIssue(sections = []) {
  for (const section of sections ?? []) {
    const issue = findQuestionBankSectionSaveIssue(section, sections);
    if (issue) return issue;
  }
  return null;
}

export function buildQuestionBankSectionSaveErrors(section, issue) {
  if (!issue?.sectionTempId || section?.tempId !== issue.sectionTempId) {
    return {};
  }

  if (issue.questionTempId) {
    const errors = validateQuestionBankSection(normalizeQuestionBankSectionForSave(section), {
      forSave: true,
    });
    const questionErrors = errors.Questions?.[issue.questionTempId];
    if (questionErrors) {
      return {
        Questions: {
          [issue.questionTempId]: questionErrors,
        },
      };
    }
    return {
      Questions: {
        [issue.questionTempId]: {
          QuestionText: issue.message,
        },
      },
    };
  }

  if (issue.field === 'DisplayName') {
    return { DisplayName: issue.message };
  }

  if (issue.field === 'SectionTitle') {
    return { SectionTitle: issue.message };
  }

  if (issue.message?.includes('ít nhất 1 câu hỏi')) {
    return { _questions: issue.message };
  }

  if (issue.message === QUESTION_BANK_SAVE_WARNINGS.LISTENING_MISSING_AUDIO) {
    return { _audio: issue.message };
  }

  if (issue.message === QUESTION_BANK_SAVE_WARNINGS.READING_MISSING_PROMPT) {
    return { SectionTitle: issue.message };
  }

  return {};
}

export function buildTestQuestionPayload(question) {
  const normalized = normalizeTestQuestion(question);
  const { tempId, QuestionText, Options } = normalized;
  const mappedOptions = (Options ?? []).map(({ OptionText, IsCorrect }) => ({
    OptionText: String(OptionText ?? '').trim(),
    IsCorrect: Boolean(IsCorrect),
  }));

  return {
    tempId,
    QuestionText: String(QuestionText ?? '').trim(),
    Score: 1,
    isActive: toBooleanDefaultTrue(normalized.isActive),
    isUseForTest: toBooleanDefaultTrue(normalized.isUseForTest),
    Options: mappedOptions,
  };
}

export function buildTestSectionPayload(section, sectionOrder) {
  const skillType = section.SkillType;
  const displayName = String(section.DisplayName ?? '').trim();

  const base = {
    tempId: section.tempId,
    SectionTitle: section.SectionTitle == null ? null : String(section.SectionTitle),
    DisplayName: displayName || getSectionDisplayTitle(section),
    SkillType: skillType,
    typeId: section.typeId ?? mapSkillTypeToTypeId(skillType),
    isUseForTest: section.isUseForTest !== false,
    Description: String(section.Description ?? '').trim() || null,
    SectionOrder: sectionOrder,
    Questions: (section.Questions ?? []).map(buildTestQuestionPayload),
  };

  if (skillType !== TEST_SKILL_LISTENING) {
    return base;
  }

  const audioUrl = String(section.AudioUrl ?? '').trim();
  const hasFile = Boolean(section.File || section.FileName);

  if (hasFile) {
    return {
      ...base,
      AudioSourceType: LISTENING_SOURCE_UPLOAD,
      AudioUrl: null,
      File: section.File ?? null,
      FileName: section.FileName ?? null,
      FileSize: section.FileSize ?? null,
    };
  }

  if (audioUrl) {
    return {
      ...base,
      AudioSourceType: LISTENING_SOURCE_LINK,
      AudioUrl: audioUrl,
      File: null,
      FileName: null,
      FileSize: null,
    };
  }

  return {
    ...base,
    AudioSourceType: LISTENING_SOURCE_UPLOAD,
    AudioUrl: null,
    File: null,
    FileName: null,
    FileSize: null,
  };
}

/**
 * Scroll tới kỹ năng / bài / câu hỏi trong builder Question Bank.
 */
export function scrollToQuestionBankItem(target, { delayMs = 180 } = {}) {
  window.setTimeout(() => {
    if (target?.type === 'question' && target.questionTempId) {
      const questionId = target.questionTempId;
      document.getElementById(`qb-question-${questionId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      return;
    }

    if (target?.sectionTempId) {
      document.getElementById(`qb-section-${target.sectionTempId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, delayMs);
}

export function buildTestMaterialPayload(material, base) {
  const totalScore = DEFAULT_TEST_TOTAL_SCORE;
  const sections = material.Sections ?? [];

  return {
    ...base,
    MaterialUrl: null,
    TotalScore: totalScore,
    ScoringMode: SCORING_MODE_AUTO,
    TestSource: material.TestSource ?? null,
    FinalTestConfig: material.FinalTestConfig ?? null,
    QuestionBankId: material.QuestionBankId ?? null,
    QuestionBankTitle: material.QuestionBankTitle ?? null,
    Sections: sections.map((section, index) => buildTestSectionPayload(section, index + 1)),
  };
}
