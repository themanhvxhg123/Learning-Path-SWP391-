import {
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
  TEST_SKILL_QB_LABELS,
  getActiveFilledTestQuestions,
  getSectionsBySkill,
  DEFAULT_TEST_TOTAL_SCORE,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  CHAPTER_QUIZ_SKILLS,
  getSectionCountForPart,
  getSectionQuestionCountsForPart,
  isSkillSectionRandomPick,
  isCourseQuizChapterId,
  buildCourseSectionTempId,
  getConfiguredSkillTypes,
} from '@/features/mentor/utils/mentorChapterQuizConfigUtils';
import { findQuestionBankByChapter } from '@/features/mentor/services/questionBankService';

function shuffleArray(items = []) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function pickRandom(items = [], count = 0) {
  const pool = shuffleArray(items);
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}

function setsEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function resolveSectionAudio(section) {
  const url = String(section?.AudioUrl ?? '').trim();
  return url || null;
}

function resolveTestQuestionId(question) {
  if (question?.QuestionId != null) return String(question.QuestionId);
  const raw = String(question?.tempId ?? '');
  return raw.replace(/^question_/, '') || raw;
}

function resolveTestChoiceId(option) {
  if (option?.ChoiceId != null) return String(option.ChoiceId);
  const raw = String(option?.tempId ?? '');
  return raw.replace(/^choice_/, '') || raw;
}

function resolveSectionReadingUrl(section) {
  const url = String(section?.MaterialUrl ?? section?.SourceUrl ?? '').trim();
  return url || null;
}

function toStudentQuestion(question, order, shuffleAnswers, sourceSection = null) {
  let options = (question.Options ?? []).map((option) => ({
    tempId: resolveTestChoiceId(option),
    optionText: option.OptionText,
  }));
  if (shuffleAnswers) {
    options = shuffleArray(options);
  }

  return {
    tempId: resolveTestQuestionId(question),
    questionType: 'MULTIPLE_CHOICE',
    skillType: question.SkillType ?? sourceSection?.SkillType ?? null,
    questionText: question.QuestionText,
    score: Number(question.Score) || 1,
    order,
    options,
    audioUrl: null,
  };
}

function toGradingQuestion(question, sourceSection = null) {
  const correctOptionTempIds = (question.Options ?? [])
    .filter((option) => option.IsCorrect)
    .map((option) => option.tempId);

  return {
    tempId: question.tempId,
    score: Number(question.Score) || 1,
    correctOptionTempIds,
    questionText: question.QuestionText,
    skillType: sourceSection?.SkillType ?? null,
    sectionDisplayName: sourceSection?.DisplayName ?? null,
    audioUrl: resolveSectionAudio(sourceSection),
  };
}

function isSectionUseForTest(section) {
  return section?.isUseForTest !== false;
}

function resolveSectionConfigKey(section, pathId = null) {
  const base = section?.tempId ?? (section?.SectionId ? `section_${section.SectionId}` : '');
  if (!base) return '';
  return pathId != null ? buildCourseSectionTempId(pathId, base) : base;
}

function flattenBankSections(bankList = []) {
  return bankList.flatMap((bank) => {
    const pathId = bank.pathId ?? bank.PathId ?? null;
    const pathName = bank.pathName ?? bank.PathName ?? null;
    const pathOrder = Number(bank.pathOrder ?? bank.PathOrder ?? bank.Order ?? 0) || null;
    return (bank.sections ?? []).map((section) => ({ section, pathId, pathName, pathOrder }));
  });
}

function pickQuestionsForSkill(config, bankList, skill) {
  const entries = flattenBankSections(bankList);
  const isCourseScope = isCourseQuizChapterId(config?.chapterId);

  if (isSkillSectionRandomPick(skill)) {
    const inTestEntries = entries.filter(({ section }) =>
      getSectionsBySkill([section], skill).length > 0 && isSectionUseForTest(section));
    const pickedEntries = pickRandom(inTestEntries, getSectionCountForPart(config, skill));
    return pickedEntries.flatMap(({ section, pathId, pathName, pathOrder }) =>
      getActiveFilledTestQuestions(section.Questions ?? []).map((question) => ({
        question,
        section,
        pathId,
        pathName,
        pathOrder,
      })),
    );
  }

  const countBySection = new Map(
    getSectionQuestionCountsForPart(config, skill).map((entry) => [
      String(entry.sectionTempId),
      entry.questionCount,
    ]),
  );

  return entries.flatMap(({ section, pathId, pathName, pathOrder }) => {
    if (!getSectionsBySkill([section], skill).length || !isSectionUseForTest(section)) {
      return [];
    }

    const configKey = isCourseScope
      ? resolveSectionConfigKey(section, pathId)
      : resolveSectionConfigKey(section);
    const fallbackKey = resolveSectionConfigKey(section);
    const configuredCount = countBySection.get(configKey)
      ?? countBySection.get(fallbackKey)
      ?? 0;

    if (configuredCount <= 0) return [];

    const pool = getActiveFilledTestQuestions(section.Questions ?? []).map((question) => ({
      question,
      section,
    }));
    return pickRandom(pool, configuredCount).map(({ question, section }) => ({
      question,
      section,
      pathId,
      pathName,
      pathOrder,
    }));
  });
}

function buildSkillSection(skillType, questionsWithSource, shuffleAnswers, startOrder) {
  if (!questionsWithSource.length) return null;

  const groupsMap = new Map();
  questionsWithSource.forEach(({ question, section, pathId, pathName, pathOrder }) => {
    const groupId = section?.tempId ?? section?.DisplayName ?? `group_${groupsMap.size + 1}`;
    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, {
        groupId,
        sectionId: section?.SectionId ?? null,
        pathId: pathId ?? section?.pathId ?? section?.PathId ?? null,
        pathName: pathName ?? section?.pathName ?? section?.PathName ?? null,
        pathOrder: pathOrder ?? section?.pathOrder ?? section?.PathOrder ?? null,
        displayName:
          String(section?.DisplayName ?? section?.SectionTitle ?? '').trim() ||
          `Nhóm ${groupsMap.size + 1}`,
        audioUrl: skillType === TEST_SKILL_LISTENING ? resolveSectionAudio(section) : null,
        readingUrl: skillType === TEST_SKILL_READING ? resolveSectionReadingUrl(section) : null,
        items: [],
      });
    }
    groupsMap.get(groupId).items.push({ question, section, pathId, pathName, pathOrder });
  });

  let order = startOrder;
  const questionGroups = [...groupsMap.values()].map((group, index) => {
    const questions = group.items.map(({ question, section }) => {
      const studentQ = toStudentQuestion(question, order, shuffleAnswers, section);
      studentQ.audioUrl =
        skillType === TEST_SKILL_LISTENING ? resolveSectionAudio(section) : null;
      order += 1;
      return studentQ;
    });

    return {
      groupId: group.groupId,
      sectionId: group.sectionId != null
        ? String(group.sectionId)
        : String(group.groupId ?? `section_${index}`),
      pathId: group.pathId != null ? Number(group.pathId) : null,
      pathName: group.pathName ?? null,
      pathOrder: group.pathOrder != null ? Number(group.pathOrder) : null,
      displayName: group.displayName || `Nhóm ${index + 1}`,
      audioUrl: group.audioUrl,
      readingUrl: group.readingUrl ?? null,
      questions,
    };
  });

  const studentQuestions = questionGroups.flatMap((group) => group.questions);
  const firstAudio =
    skillType === TEST_SKILL_LISTENING
      ? questionGroups.map((group) => group.audioUrl).find(Boolean) ?? null
      : null;

  return {
    skillType,
    displayName: `Phần ${TEST_SKILL_QB_LABELS[skillType]}`,
    description: `Hoàn thành ${studentQuestions.length} câu hỏi phần ${TEST_SKILL_QB_LABELS[skillType].toLowerCase()}.`,
    audioUrl: firstAudio,
    questionGroups,
    questions: studentQuestions,
  };
}

function buildPaperFromBanks(config, bankList, options = {}) {
  const shuffleAnswers = true; //luôn đảo đáp án

  const pickedBySkill = Object.fromEntries(
    CHAPTER_QUIZ_SKILLS.map((skill) => [
      skill,
      pickQuestionsForSkill(config, bankList, skill),
    ]),
  );

  let order = 1;
  const paperSections = [];
  const gradingQuestions = [];

  CHAPTER_QUIZ_SKILLS.forEach((skill) => {
    const section = buildSkillSection(skill, pickedBySkill[skill], shuffleAnswers, order);
    if (!section) return;
    paperSections.push(section);
    order += section.questions.length;

    pickedBySkill[skill].forEach(({ question, section: sourceSection }) => {
      gradingQuestions.push(toGradingQuestion(question, sourceSection));
    });
  });

  const totalQuestions = paperSections.reduce(
    (sum, section) => sum + section.questions.length,
    0,
  );

  return {
    paperId: `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    totalQuestions,
    totalScore: DEFAULT_TEST_TOTAL_SCORE,
    scoringMode: 'AUTO',
    sections: paperSections,
    gradingQuestions,
    isDemo: Boolean(options.isDemo),
  };
}

export function buildTestPaperFromLoadedBank(config, bank, options = {}) {
  if (!bank) {
    return { ok: false, message: 'Chương chưa có ngân hàng câu hỏi.' };
  }

  const paper = buildPaperFromBanks(config, [bank], options);
  if (paper.totalQuestions <= 0) {
    return { ok: false, message: 'Không đủ câu hỏi để tạo đề kiểm tra.' };
  } 

  return { ok: true, paper };
}

function countRawPaperSectionsForSkill(paper, skillType) {
  return (paper?.sections ?? []).filter((section) => section?.skillType === skillType).length;
}

function isListeningReadingSkillAligned(paper, config, skillType) {
  const expectedCount = getSectionCountForPart(config, skillType);
  if (expectedCount <= 0) return true;
  return countRawPaperSectionsForSkill(paper, skillType) === expectedCount;
}

function isVocabularySkillAligned(paper, config) {
  const expectedEntries = getSectionQuestionCountsForPart(config, TEST_SKILL_VOCABULARY)
    .filter((entry) => entry.questionCount > 0);
  if (expectedEntries.length === 0) return true;

  const vocabSections = (paper?.sections ?? []).filter(
    (section) => section?.skillType === TEST_SKILL_VOCABULARY,
  );
  if (vocabSections.length !== expectedEntries.length) return false;

  return expectedEntries.every((entry) => {
    const sectionId = String(entry.sectionTempId).replace(/^section_/, '');
    const matched = vocabSections.find((section) => String(section.sectionId) === sectionId);
    return Boolean(matched) && (matched.questions?.length ?? 0) > 0;
  });
}

export function isRawPaperAlignedWithConfig(paper, config = {}) {
  const expectedSkills = getConfiguredSkillTypes(config);
  const paperSkills = new Set((paper?.sections ?? []).map((section) => section?.skillType));

  if (!expectedSkills.every((skill) => paperSkills.has(skill))) {
    return false;
  }

  if (!isListeningReadingSkillAligned(paper, config, TEST_SKILL_LISTENING)) return false;
  if (!isListeningReadingSkillAligned(paper, config, TEST_SKILL_READING)) return false;
  if (!isVocabularySkillAligned(paper, config)) return false;

  return true;
}

export function mergeRawPapersByConfig(backendPaper, configPaper, config = {}) {
  const expectedSkills = getConfiguredSkillTypes(config);
  const backendSections = backendPaper?.sections ?? [];
  const configSections = configPaper?.sections ?? [];
  const mergedSections = [];

  expectedSkills.forEach((skillType) => {
    const backendSkillSections = backendSections.filter((section) => section.skillType === skillType);
    const configSkillSections = configSections.filter((section) => section.skillType === skillType);

    let useBackend = false;
    if (isSkillSectionRandomPick(skillType)) {
      useBackend = isListeningReadingSkillAligned(
        { sections: backendSkillSections },
        config,
        skillType,
      );
    } else if (skillType === TEST_SKILL_VOCABULARY) {
      useBackend = isVocabularySkillAligned({ sections: backendSkillSections }, config);
    }

    if (useBackend && backendSkillSections.length > 0) {
      mergedSections.push(...backendSkillSections);
      return;
    }

    if (configSkillSections.length > 0) {
      mergedSections.push(...configSkillSections);
    }
  });

  const totalQuestions = mergedSections.reduce(
    (sum, section) => sum + (section.questions?.length ?? 0),
    0,
  );

  return {
    ...(backendPaper ?? {}),
    ...(configPaper ?? {}),
    sections: mergedSections,
    totalQuestions: totalQuestions || configPaper?.totalQuestions || backendPaper?.totalQuestions || 0,
  };
}

export function buildChapterTestPaper(courseId, chapterId, config) {
  const bankRes = findQuestionBankByChapter(courseId, chapterId);
  if (!bankRes.ok || !bankRes.bank) {
    return { ok: false, message: 'Chương chưa có ngân hàng câu hỏi.' };
  }

  const paper = buildPaperFromBanks(config, [bankRes.bank]);
  if (paper.totalQuestions <= 0) {
    return { ok: false, message: 'Không đủ câu hỏi để tạo đề kiểm tra.' };
  }

  return { ok: true, paper };
}

export function buildCourseTestPaper(courseId, config) {
  const selectedIds = (config.selectedChapterIds ?? []).map(String);
  const banks = selectedIds
    .map((chapterId) => findQuestionBankByChapter(courseId, chapterId))
    .filter((res) => res.ok && res.bank)
    .map((res) => res.bank);

  if (!banks.length) {
    return { ok: false, message: 'Khóa học chưa có ngân hàng câu hỏi phù hợp.' };
  }

  const paper = buildPaperFromBanks(config, banks);
  if (paper.totalQuestions <= 0) {
    return { ok: false, message: 'Không đủ câu hỏi để tạo đề kiểm tra.' };
  }

  return { ok: true, paper };
}

export function buildTestPaper(courseId, scope, chapterId, config) {
  if (scope === 'final' || isCourseQuizChapterId(config?.chapterId)) {
    return buildCourseTestPaper(courseId, config);
  }
  return buildChapterTestPaper(courseId, chapterId, config);
}

export function gradeTestAnswers(gradingQuestions = [], answers = {}, totalScore = 100) {
  const totalQuestions = gradingQuestions.length;
  if (totalQuestions === 0) {
    return {
      score: 0,
      maxScore: totalScore,
      percentage: 0,
      passed: false,
      correctCount: 0,
      totalQuestions: 0,
      questionReview: [],
    };
  }

  const perQuestionScore = totalScore / totalQuestions;
  let correctCount = 0;
  let earnedScore = 0;

  const questionReview = gradingQuestions.map((question) => {
    const selected = [...(answers[question.tempId] ?? [])].sort();
    const correct = [...(question.correctOptionTempIds ?? [])].sort();
    const isCorrect = setsEqual(selected, correct);
    if (isCorrect) {
      correctCount += 1;
      earnedScore += perQuestionScore;
    }

    return {
      questionTempId: question.tempId,
      questionText: question.questionText,
      isCorrect,
      selectedOptionTempIds: selected,
      correctOptionTempIds: correct,
    };
  });

  const score = Math.round(earnedScore * 10) / 10;
  const percentage = Math.round((score / totalScore) * 1000) / 10;

  return {
    score,
    maxScore: totalScore,
    percentage,
    correctCount,
    totalQuestions,
    questionReview,
  };
}

export function formatTimer(seconds = 0) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function flattenPaperQuestions(paper) {
  return (paper?.sections ?? []).flatMap((section) => {
    if (section?.questions?.length) {
      return section.questions;
    }
    return (section?.questionGroups ?? []).flatMap((group) => group.questions ?? []);
  });
}

function resolvePaperSectionTitle(section, index = 0) {
  const title = String(
    section?.title
    ?? section?.displayName
    ?? section?.sectionName
    ?? section?.SectionTitle
    ?? '',
  ).trim();
  return title || `Section ${index + 1}`;
}

function toQuestionGroupFromPaperSection(section, index = 0) {
  const listeningUrl = section?.audioUrl ?? null;
  const readingUrl = section?.readingUrl ?? section?.sourceUrl
    ?? (section?.skillType === TEST_SKILL_READING ? section?.audioUrl : null)
    ?? null;

  return {
    groupId: String(section?.sectionId ?? section?.groupId ?? `section_${index}`),
    sectionId: String(section?.sectionId ?? section?.groupId ?? `section_${index}`),
    pathId: section?.pathId != null ? Number(section.pathId) : null,
    pathName: section?.pathName ?? section?.PathName ?? null,
    pathOrder: section?.pathOrder != null
      ? Number(section.pathOrder)
      : (section?.PathOrder != null ? Number(section.PathOrder) : null),
    displayName: resolvePaperSectionTitle(section, index),
    audioUrl: section?.skillType === TEST_SKILL_LISTENING ? listeningUrl : null,
    readingUrl: section?.skillType === TEST_SKILL_READING ? readingUrl : null,
    questions: section?.questions ?? [],
  };
}

function mergeSkillPaperSections(skillType, sections = []) {
  if (!sections.length) return null;

  if (sections.length === 1 && sections[0]?.questionGroups?.length) {
    const section = sections[0];
    const questionGroups = section.questionGroups;
    return {
      ...section,
      skillType,
      displayName: section.displayName ?? `Phần ${TEST_SKILL_QB_LABELS[skillType]}`,
      questionGroups,
      questions: section.questions?.length
        ? section.questions
        : questionGroups.flatMap((group) => group.questions ?? []),
    };
  }

  const questionGroups = sections.flatMap((section, index) => {
    if (section?.questionGroups?.length) {
      return section.questionGroups.map((group, groupIndex) => ({
        ...group,
        groupId: group.groupId ?? `${section.sectionId ?? index}_${groupIndex}`,
        sectionId: group.sectionId ?? group.groupId ?? String(section.sectionId ?? index),
        pathId: group.pathId ?? section.pathId ?? null,
        pathName: group.pathName ?? section.pathName ?? section.PathName ?? null,
        pathOrder: group.pathOrder ?? section.pathOrder ?? section.PathOrder ?? null,
        displayName: group.displayName || resolvePaperSectionTitle(section, index),
      }));
    }
    return [toQuestionGroupFromPaperSection(section, index)];
  });

  const questions = questionGroups.flatMap((group) => group.questions ?? []);

  return {
    skillType,
    displayName: `Phần ${TEST_SKILL_QB_LABELS[skillType]}`,
    questionGroups,
    questions,
    audioUrl: skillType === TEST_SKILL_LISTENING
      ? questionGroups.map((group) => group.audioUrl).find(Boolean) ?? null
      : null,
    readingUrl: skillType === TEST_SKILL_READING
      ? questionGroups.map((group) => group.readingUrl).find(Boolean) ?? null
      : null,
  };
}

/** Gộp nhiều section cùng kỹ năng (format backend) thành 1 phần với questionGroups theo section QB. */
export function normalizeTestPaper(paper) {
  if (!paper?.sections?.length) {
    return paper ?? null;
  }

  const sectionsBySkill = new Map();
  paper.sections.forEach((section) => {
    const skillType = section?.skillType;
    if (!skillType) return;
    if (!sectionsBySkill.has(skillType)) {
      sectionsBySkill.set(skillType, []);
    }
    sectionsBySkill.get(skillType).push(section);
  });

  const sections = CHAPTER_QUIZ_SKILLS
    .filter((skillType) => sectionsBySkill.has(skillType))
    .map((skillType) => mergeSkillPaperSections(skillType, sectionsBySkill.get(skillType)))
    .filter(Boolean);

  const totalQuestions = sections.reduce(
    (sum, section) => sum + (section.questions?.length ?? 0),
    0,
  );

  return {
    ...paper,
    sections,
    totalQuestions: totalQuestions || paper.totalQuestions || 0,
  };
}

export function getSectionQuestionGroups(section) {
  if (section?.questionGroups?.length) {
    return section.questionGroups;
  }
  if (!section?.questions?.length) {
    return [];
  }
  return [
    {
      groupId: 'default',
      displayName: 'Câu hỏi',
      audioUrl: section.audioUrl ?? null,
      pathId: section.pathId ?? null,
      pathName: section.pathName ?? null,
      pathOrder: section.pathOrder ?? null,
      questions: section.questions,
    },
  ];
}
