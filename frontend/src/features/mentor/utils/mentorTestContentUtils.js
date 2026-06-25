// TODO: backend should support TEST material details: Sections, SkillType, Questions, Options, Pairs, Answers

let testTempIdCounter = 0;

function createTestTempId(prefix = 'tmp') {
  testTempIdCounter += 1;
  return `${prefix}_${Date.now()}_${testTempIdCounter}`;
}

export { createTestTempId };

export const TEST_SKILL_LISTENING = 'LISTENING';
export const TEST_SKILL_READING = 'READING';
export const TEST_SKILL_WRITING = 'WRITING';

export const TEST_SKILLS = [TEST_SKILL_LISTENING, TEST_SKILL_READING, TEST_SKILL_WRITING];

export const TEST_SKILL_LABELS = {
  [TEST_SKILL_LISTENING]: 'Nghe',
  [TEST_SKILL_READING]: 'Đọc',
  [TEST_SKILL_WRITING]: 'Trắc nghiệm',
};

export const TEST_SKILL_QB_LABELS = TEST_SKILL_LABELS;

export const TEST_SKILL_CHIP_COLORS = {
  [TEST_SKILL_LISTENING]: { color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  [TEST_SKILL_READING]: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
  [TEST_SKILL_WRITING]: { color: '#EA580C', bg: 'rgba(234,88,12,0.12)' },
};

export const LISTENING_SOURCE_UPLOAD = 'UPLOAD';
export const LISTENING_SOURCE_LINK = 'LINK';

export const AUDIO_ALLOWED_EXTENSIONS = ['.mp3', '.mp4'];

/** Đuôi file không dấu chấm — dùng khi so khớp tên file. */
export const AUDIO_ALLOWED_EXTENSION_NAMES = ['mp3', 'mp4'];

const AUDIO_ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'video/mp4',
]);

/** Dùng cho input[type=file] — hỗ trợ cả MIME và đuôi .mp3 / .mp4. */
export const LISTENING_AUDIO_FILE_ACCEPT =
  'audio/mpeg,audio/mp3,audio/mp4,video/mp4,.mp3,.mp4';

/** Khớp giới hạn Cloudinary free tier — 10 MB. */
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export const LISTENING_AUDIO_INVALID_TYPE_MESSAGE =
  'Chỉ hỗ trợ file đuôi .mp3 hoặc .mp4.';

export const LISTENING_AUDIO_MAX_SIZE_MESSAGE =
  'File quá lớn. Dung lượng tối đa là 10 MB.';

export function getListeningAudioMaxSizeLabel() {
  return '10 MB';
}

/** Lấy đuôi file (mp3, mp4…) — không phân biệt hoa thường. */
export function getListeningAudioExtension(fileName) {
  const match = String(fileName ?? '')
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

export function isAllowedListeningAudioExtension(ext) {
  if (!ext) return false;
  return AUDIO_ALLOWED_EXTENSION_NAMES.includes(String(ext).trim().toLowerCase());
}

export function isAllowedAudioFile(file) {
  if (!file) return false;
  const ext = getListeningAudioExtension(file.name);
  if (isAllowedListeningAudioExtension(ext)) return true;
  const mime = String(file.type ?? '').trim().toLowerCase();
  return AUDIO_ALLOWED_MIME_TYPES.has(mime);
}

export function isAllowedListeningAudioFileName(fileName) {
  return isAllowedListeningAudioExtension(getListeningAudioExtension(fileName));
}

/** Kiểm tra định dạng + dung lượng file audio bài nghe. */
export function validateListeningAudioFile(file) {
  if (!file) {
    return { ok: false, message: 'Vui lòng chọn file .mp3 hoặc .mp4.' };
  }
  if (!isAllowedAudioFile(file)) {
    return { ok: false, message: LISTENING_AUDIO_INVALID_TYPE_MESSAGE };
  }
  if (Number(file.size) > AUDIO_MAX_BYTES) {
    return { ok: false, message: LISTENING_AUDIO_MAX_SIZE_MESSAGE };
  }
  return { ok: true };
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

function isBrowserFile(value) {
  return typeof File !== 'undefined' && value instanceof File;
}

function isSimpleUrl(value) {
  const trimmed = String(value ?? '').trim();
  return /^https?:\/\/.+/i.test(trimmed);
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

export function isMultipleChoiceQuestion(question) {
  const type = question?.QuestionType;
  return (
    type === QUESTION_TYPE_MULTIPLE_CHOICE || type === LEGACY_QUESTION_TYPE_SINGLE_CHOICE
  );
}

export function normalizeTestQuestion(question) {
  if (!question) return createEmptyTestQuestion();

  const legacySingle = question.QuestionType === LEGACY_QUESTION_TYPE_SINGLE_CHOICE;
  const isMc =
    question.QuestionType === QUESTION_TYPE_MULTIPLE_CHOICE || legacySingle;

  if (!isMc) {
    return createEmptyTestQuestion();
  }

  const options =
    (question.Options ?? []).length >= 2
      ? question.Options
      : createDefaultMultipleChoiceOptions();

  return {
    ...question,
    QuestionType: QUESTION_TYPE_MULTIPLE_CHOICE,
    AllowMultipleAnswers: legacySingle ? false : Boolean(question.AllowMultipleAnswers),
    isActive: question.isActive !== false,
    Options: options,
  };
}

export function isQuestionActive(question) {
  return question?.isActive !== false;
}

export function isPersistedQuestionLocked(question, persistedQuestionIds, coursePublished) {
  if (!coursePublished || !question?.tempId) return false;
  const ids = persistedQuestionIds instanceof Set
    ? persistedQuestionIds
    : new Set(persistedQuestionIds ?? []);
  return ids.has(question.tempId) && isFilledTestQuestion(question);
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
  const { isActive: _isActive, ...content } = payload;
  return JSON.stringify(content);
}

export function buildQuestionSnapshotMap(sections = []) {
  const map = new Map();
  (sections ?? []).forEach((section) => {
    getFilledTestQuestions(section?.Questions).forEach((question) => {
      if (question.tempId) {
        map.set(question.tempId, buildQuestionContentSnapshot(question));
      }
    });
  });
  return map;
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
export const SCORING_MODE_MANUAL = 'MANUAL';

export const SCORING_MODES = [SCORING_MODE_AUTO, SCORING_MODE_MANUAL];

export const SCORING_MODE_LABELS = {
  [SCORING_MODE_AUTO]: 'Tự chia đều',
  [SCORING_MODE_MANUAL]: 'Nhập điểm thủ công',
};

export const DEFAULT_TEST_TOTAL_SCORE = 100;

export const TEST_SOURCE_CHAPTER_QUIZ = 'CHAPTER_QUIZ';
export const TEST_SOURCE_COURSE_FINAL = 'COURSE_FINAL';

export function getDefaultFinalTestConfig() {
  return {
    totalQuestions: 30,
    listeningCount: 10,
    readingCount: 10,
    writingCount: 10,
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
    Number(config.writingCount ?? 0)
  );
}

export function validateFinalTestConfig(config = {}, stats = null) {
  const errors = {};
  const listening = Number(config.listeningCount ?? 0);
  const reading = Number(config.readingCount ?? 0);
  const writing = Number(config.writingCount ?? 0);
  const total = getFinalTestConfigTotal(config);

  if (!Number.isFinite(total) || total <= 0) {
    errors._total = 'Vui lòng cấu hình ít nhất 1 câu hỏi cho bài kiểm tra cuối khóa';
    return errors;
  }

  [listening, reading, writing].forEach((value, index) => {
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
    if (writing > (stats.questionCountBySkill[TEST_SKILL_WRITING] ?? 0)) {
      errors.writingCount = 'Không đủ câu hỏi Từ vựng / Ngữ pháp trong các bank chương';
    }
    if ((stats.chapterBankCount ?? 0) === 0) {
      errors._banks = 'Khóa học chưa có ngân hàng câu hỏi theo chương';
    }
  }

  return errors;
}

export function getEffectiveScoringMode(material) {
  return material?.ScoringMode === SCORING_MODE_MANUAL ? SCORING_MODE_MANUAL : SCORING_MODE_AUTO;
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
    [TEST_SKILL_WRITING]: getSectionsBySkill(sections, TEST_SKILL_WRITING).reduce(
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
  return getAllQuestions(sections).reduce((sum, question) => {
    const score = Number(question.Score);
    return sum + (Number.isFinite(score) && score > 0 ? score : 0);
  }, 0);
}

export function calculateSectionManualScore(section) {
  return (section?.Questions ?? []).reduce((sum, question) => {
    const score = Number(question.Score);
    return sum + (Number.isFinite(score) && score > 0 ? score : 0);
  }, 0);
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
  const count = (section?.Questions ?? []).length;
  if (count === 0) return '0 câu';

  if (scoringMode === SCORING_MODE_AUTO) {
    const perQuestion = calculateAutoQuestionScore(totalScore, questionCountAll);
    const sectionScore = Math.round(perQuestion * count * 100) / 100;
    return `${count} câu · khoảng ${formatScoreValue(sectionScore)} điểm`;
  }

  const sectionScore = calculateSectionManualScore(section);
  return `${count} câu · ${formatScoreValue(sectionScore)} điểm`;
}

export function createEmptyTestSection(skillType = TEST_SKILL_READING) {
  return {
    tempId: createTestTempId('section'),
    SectionTitle: '',
    DisplayName: '',
    SkillType: skillType,
    Description: '',
    Questions: [],
    ...(skillType === TEST_SKILL_LISTENING ? getListeningSectionFields() : {}),
  };
}

/** Ba bài mặc định (mỗi kỹ năng một bài) cho ngân hàng câu hỏi. */
export function createQuestionBankSkillSections() {
  return TEST_SKILLS.map((skill) => createEmptyTestSection(skill));
}

/** Giữ dữ liệu bank hiện có, bổ sung bài trống cho kỹ năng còn thiếu. */
export function ensureQuestionBankSkillSections(sections = []) {
  const normalized = consolidateWritingSections(sections);
  const persistedSections = getNonEmptyQuestionBankSections(normalized);
  return TEST_SKILLS.flatMap((skill) => {
    const skillSections = getSectionsBySkill(persistedSections, skill);
    return skillSections.length > 0 ? skillSections : [createEmptyTestSection(skill)];
  });
}

export function getSectionsBySkill(sections = [], skillType) {
  return sections.filter((section) => section.SkillType === skillType);
}

export function getSectionBySkill(sections = [], skillType) {
  return getSectionsBySkill(sections, skillType)[0] ?? null;
}

export function getSectionBaiNumber(section, sections = []) {
  if (!section) return 1;
  const skillSections = getSectionsBySkill(sections, section.SkillType);
  const index = skillSections.findIndex((item) => item.tempId === section.tempId);
  return index >= 0 ? index + 1 : skillSections.length + 1;
}

export function getQuestionBankSectionNameFallback(section, sections = []) {
  const index = getSectionBaiNumber(section, sections);
  return `Bài số ${index}`;
}

export function getQuestionBankSectionNamePlaceholder(section) {
  return 'Chưa có tên bài';
}

/** Trắc nghiệm (WRITING) dùng một list phẳng — không thêm/xóa bài con. */
export function supportsQuestionBankMultiSection(skillType) {
  return skillType !== TEST_SKILL_WRITING;
}

/** Gộp mọi section WRITING thành một (migrate data cũ có nhiều nhóm). */
export function consolidateWritingSections(sections = []) {
  const writingSections = getSectionsBySkill(sections, TEST_SKILL_WRITING);
  if (writingSections.length <= 1) return sections;

  const mergedQuestions = writingSections.flatMap((section) => section.Questions ?? []);
  const primary = {
    ...writingSections[0],
    Questions: mergedQuestions,
    DisplayName: '',
    SectionTitle: '',
    Description: '',
  };

  let merged = false;
  return sections.reduce((acc, section) => {
    if (section.SkillType !== TEST_SKILL_WRITING) {
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

/** @deprecated use getQuestionBankSectionNameFallback — kept for imports */
export function getQuestionBankSectionDisplayTitle(section, sections = []) {
  const name = String(section?.DisplayName ?? '').trim();
  if (name) return name;
  return getQuestionBankSectionNameFallback(section, sections);
}

export function getQuestionBankSectionTabLabel(section, sections = []) {
  const name = String(section?.DisplayName ?? '').trim();
  if (name) return name;
  return getQuestionBankSectionNameFallback(section, sections);
}

export function isQuestionBankWritingSkill(skillType) {
  return skillType === TEST_SKILL_WRITING;
}

export function createQuestionBankSection(skillType = TEST_SKILL_READING) {
  return createEmptyTestSection(skillType);
}

export function getNonEmptyQuestionBankSections(sections = []) {
  return sections
    .map((section) => ({
      ...section,
      Questions: getFilledTestQuestions(section.Questions),
    }))
    .filter((section) => section.Questions.length > 0);
}

/** Trim text fields trước khi gửi API — giữ nguyên space khi đang nhập trên form. */
export function normalizeQuestionBankSectionForSave(section) {
  const next = {
    ...section,
    SectionTitle: String(section.SectionTitle ?? '').trim(),
    Description: String(section.Description ?? '').trim(),
    DisplayName: String(section.DisplayName ?? '').trim(),
  };
  if (section.SkillType === TEST_SKILL_LISTENING) {
    next.AudioUrl = String(section.AudioUrl ?? '').trim();
  }
  return next;
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

export function createEmptyTestQuestion() {
  return {
    tempId: createTestTempId('question'),
    QuestionType: QUESTION_TYPE_MULTIPLE_CHOICE,
    QuestionText: '',
    Score: 1,
    AllowMultipleAnswers: false,
    isActive: true,
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

function isPositiveScore(value) {
  const score = Number(value);
  return Number.isFinite(score) && score > 0;
}

export function validateTestQuestion(question, { validateScore = true } = {}) {
  const normalized = normalizeTestQuestion(question);
  const qErrors = {};

  if (!String(normalized.QuestionText ?? '').trim()) {
    qErrors.QuestionText = 'Vui lòng nhập nội dung câu hỏi';
  }

  if (validateScore && !isPositiveScore(normalized.Score)) {
    qErrors.Score = 'Vui lòng nhập điểm cho câu hỏi';
  }

  const options = normalized.Options ?? [];
  if (options.length < 2) {
    qErrors._options = 'Cần ít nhất 2 đáp án';
  }
  const optionErrors = {};
  options.forEach((option) => {
    if (!String(option.OptionText ?? '').trim()) {
      optionErrors[option.tempId] = { OptionText: 'Vui lòng nhập đáp án' };
    }
  });
  if (Object.keys(optionErrors).length > 0) {
    qErrors.Options = optionErrors;
  }
  const correctCount = options.filter((option) => option.IsCorrect).length;
  const allowMultiple = Boolean(normalized.AllowMultipleAnswers);

  if (options.length >= 2) {
    if (allowMultiple) {
      if (correctCount < 1) {
        qErrors._correctOption = 'Vui lòng chọn ít nhất một đáp án đúng';
      }
    } else if (correctCount !== 1) {
      qErrors._correctOption = 'Vui lòng chọn đáp án đúng';
    }
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

  const scoringMode = getEffectiveScoringMode(material);
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
  const validateScore = scoringMode === SCORING_MODE_MANUAL;
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

    if (
      section.SkillType === TEST_SKILL_LISTENING
    ) {
      const hasFile = Boolean(section.File || section.FileName);
      const audioUrl = String(section.AudioUrl ?? '').trim();
      const hasLink = Boolean(audioUrl);

      if (!hasFile && !hasLink) {
        sErrors._audio = 'Vui lòng tải file audio hoặc nhập link nghe';
      } else if (hasLink && !isSimpleUrl(audioUrl)) {
        sErrors.AudioUrl = 'Vui lòng nhập link audio hoặc video nghe hợp lệ';
      } else if (isBrowserFile(section.File)) {
        const fileCheck = validateListeningAudioFile(section.File);
        if (!fileCheck.ok) {
          sErrors.File = fileCheck.message;
        }
      } else if (hasFile && section.FileName && !isAllowedListeningAudioFileName(section.FileName)) {
        sErrors.File = LISTENING_AUDIO_INVALID_TYPE_MESSAGE;
      } else if (hasFile && Number(section.FileSize) > AUDIO_MAX_BYTES) {
        sErrors.File = LISTENING_AUDIO_MAX_SIZE_MESSAGE;
      }
    }

    const questionErrors = {};
    questions.forEach((question) => {
      if (!isFilledTestQuestion(question)) return;
      const qErrors = validateTestQuestion(question, { validateScore });
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

  if (scoringMode === SCORING_MODE_MANUAL) {
    const questionCount = getQuestionCount(sections);
    const targetTotal = DEFAULT_TEST_TOTAL_SCORE;
    if (questionCount > 0) {
      const manualTotal = calculateManualTotalScore(sections);
      if (!scoresMatch(targetTotal, manualTotal)) {
        materialErrors._scoreMismatch =
          'Tổng điểm câu hỏi chưa khớp với tổng điểm bài kiểm tra';
      }
    }
  }

  return materialErrors;
}

export function buildTestQuestionPayload(question) {
  const normalized = normalizeTestQuestion(question);
  const { tempId, QuestionText, Score, Options } = normalized;

  return {
    tempId,
    QuestionType: QUESTION_TYPE_MULTIPLE_CHOICE,
    QuestionText: String(QuestionText ?? '').trim(),
    Score: Number(Score) || 1,
    AllowMultipleAnswers: Boolean(normalized.AllowMultipleAnswers),
    isActive: normalized.isActive !== false,
    Options: (Options ?? []).map(({ OptionText, IsCorrect }) => ({
      OptionText: String(OptionText ?? '').trim(),
      IsCorrect: Boolean(IsCorrect),
    })),
  };
}

export function buildTestSectionPayload(section, sectionOrder) {
  const skillType = section.SkillType;
  const sectionTitle = String(section.SectionTitle ?? '').trim();

  const base = {
    tempId: section.tempId,
    SectionTitle: sectionTitle || getSectionDisplayTitle(section),
    DisplayName: String(section.DisplayName ?? '').trim() || null,
    SkillType: skillType,
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
      document.getElementById(`qb-question-${target.questionTempId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
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
  const scoringMode = getEffectiveScoringMode(material);
  const totalScore = DEFAULT_TEST_TOTAL_SCORE;
  let sections = material.Sections ?? [];

  if (scoringMode === SCORING_MODE_AUTO) {
    sections = applyAutoScoresToQuestions(sections, totalScore);
  }

  return {
    ...base,
    MaterialUrl: null,
    TotalScore: totalScore,
    ScoringMode: scoringMode,
    TestSource: material.TestSource ?? null,
    FinalTestConfig: material.FinalTestConfig ?? null,
    QuestionBankId: material.QuestionBankId ?? null,
    QuestionBankTitle: material.QuestionBankTitle ?? null,
    Sections: sections.map((section, index) => buildTestSectionPayload(section, index + 1)),
  };
}
