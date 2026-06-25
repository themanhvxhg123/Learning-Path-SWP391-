import {
  LISTENING_SOURCE_LINK,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
  TEST_SKILL_LABELS,
  createQuestionBankSection,
  createTestTempId,
  ensureQuestionBankSkillSections,
  isFilledTestQuestion,
} from '@/features/mentor/utils/mentorTestContentUtils';

export const SKILL_TYPE_ID_MAP = {
  [TEST_SKILL_LISTENING]: 1,
  [TEST_SKILL_READING]: 2,
  [TEST_SKILL_WRITING]: 3,
};

const TYPE_ID_SKILL_MAP = {
  1: TEST_SKILL_LISTENING,
  2: TEST_SKILL_READING,
  3: TEST_SKILL_WRITING,
};

/** UI sections → JSON gửi POST tạo question bank. */
export function buildQuestionBankApiPayload(sections = [], options = {}) {
  const orderByType = { 1: 0, 2: 0, 3: 0 };
  const questions = [];

  for (const section of sections) {
    const typeId = SKILL_TYPE_ID_MAP[section.SkillType];
    if (!typeId) continue;

    const audioUrl =
      section.SkillType === TEST_SKILL_LISTENING
        ? String(section.AudioUrl ?? '').trim() || null
        : null;

    for (const question of section.Questions ?? []) {
      if (!isFilledTestQuestion(question) || question.isActive === false) continue;
      orderByType[typeId] += 1;
      questions.push({
        TypeId: typeId,
        Title: String(question.QuestionText ?? '').trim(),
        URL: section.SkillType === TEST_SKILL_LISTENING ? audioUrl : null,
        Order: orderByType[typeId],
        IsActive: true,
        Choices: (question.Options ?? [])
          .map((opt, i) => ({
            Title: String(opt.OptionText ?? '').trim(),
            Order: i + 1,
            IsTrue: Boolean(opt.IsCorrect),
          }))
          .filter((c) => c.Title),
      });
    }
  }

  return {
    IsPublished: Boolean(options.isPublished),
    BankDescription: options.bankDescription ?? null,
    Questions: questions,
  };
}

function mapApiQuestionToUi(row) {
  const correctCount = (row.Choices ?? []).filter((c) => c.IsTrue).length;
  return {
    tempId: createTestTempId('question'),
    QuestionId: row.QuestionId,
    QuestionType: 'MULTIPLE_CHOICE',
    QuestionText: row.Title,
    Score: 1,
    AllowMultipleAnswers: correctCount > 1,
    isActive: row.IsActive !== false,
    Options: (row.Choices ?? []).map((c) => ({
      tempId: createTestTempId('option'),
      ChoiceId: c.ChoiceId,
      OptionText: c.Title,
      IsCorrect: Boolean(c.IsTrue),
    })),
  };
}

/** API response → UI sections. */
export function mapApiQuestionsToSections(questions = []) {
  const listeningByUrl = new Map();
  const reading = [];
  const writing = [];

  for (const row of questions) {
    const skill = TYPE_ID_SKILL_MAP[row.TypeId];
    const uiQuestion = mapApiQuestionToUi(row);
    if (skill === TEST_SKILL_LISTENING) {
      const url = row.URL ?? '';
      if (!listeningByUrl.has(url)) listeningByUrl.set(url, []);
      listeningByUrl.get(url).push(uiQuestion);
    } else if (skill === TEST_SKILL_READING) {
      reading.push(uiQuestion);
    } else if (skill === TEST_SKILL_WRITING) {
      writing.push(uiQuestion);
    }
  }

  const sections = [];
  listeningByUrl.forEach((qs, url) => {
    sections.push({
      ...createQuestionBankSection(TEST_SKILL_LISTENING),
      AudioUrl: url,
      AudioSourceType: LISTENING_SOURCE_LINK,
      Questions: qs,
    });
  });
  if (reading.length) {
    sections.push({ ...createQuestionBankSection(TEST_SKILL_READING), Questions: reading });
  }
  if (writing.length) {
    sections.push({ ...createQuestionBankSection(TEST_SKILL_WRITING), Questions: writing });
  }

  return ensureQuestionBankSkillSections(sections);
}

/** API Questions[] → danh sách phẳng cho trang quản lý. */
export function mapApiQuestionsToListItems(questions = []) {
  return (questions ?? [])
    .map((row, index) => {
      const skillType = TYPE_ID_SKILL_MAP[row.TypeId] ?? TEST_SKILL_WRITING;
      return {
        QuestionId: row.QuestionId,
        Title: row.Title ?? '',
        TypeId: row.TypeId,
        SkillType: skillType,
        SkillLabel: TEST_SKILL_LABELS[skillType] ?? skillType,
        Order: row.Order ?? index + 1,
        isActive: row.IsActive !== false,
        Choices: row.Choices ?? [],
        URL: row.URL ?? null,
      };
    })
    .sort((a, b) => a.TypeId - b.TypeId || a.Order - b.Order);
}

export function mapPathBankApiToBank(apiData, courseId, pathId) {
  const resolvedCourseId = Number(courseId ?? apiData?.CourseId);
  const resolvedPathId = Number(pathId ?? apiData?.PathId);
  return {
    id: apiData.BankId,
    BankId: apiData.BankId,
    courseId: resolvedCourseId,
    chapterId: resolvedPathId,
    PathId: resolvedPathId,
    title: apiData.PathName ?? '',
    chapterTitle: apiData.PathName ?? '',
    sections: mapApiQuestionsToSections(apiData.Questions ?? []),
    questionList: mapApiQuestionsToListItems(apiData.Questions ?? []),
    totalQuestionCount: (apiData.Questions ?? []).length,
    updatedAt: new Date().toISOString(),
  };
}
