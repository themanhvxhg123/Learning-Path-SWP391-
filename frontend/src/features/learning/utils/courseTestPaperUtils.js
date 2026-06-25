import {
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
  TEST_SKILL_QB_LABELS,
  getActiveFilledTestQuestions,
  getSectionsBySkill,
  DEFAULT_TEST_TOTAL_SCORE,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  getQuestionCountForPart,
  getWritingSectionGroupsFromConfig,
  isCourseQuizChapterId,
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

function toStudentQuestion(question, order, shuffleAnswers) {
  let options = (question.Options ?? []).map((option) => ({
    tempId: option.tempId,
    optionText: option.OptionText,
  }));
  if (shuffleAnswers) {
    options = shuffleArray(options);
  }

  return {
    tempId: question.tempId,
    questionType: question.QuestionType ?? 'MULTIPLE_CHOICE',
    questionText: question.QuestionText,
    allowMultipleAnswers: Boolean(question.AllowMultipleAnswers),
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
    allowMultipleAnswers: Boolean(question.AllowMultipleAnswers),
    score: Number(question.Score) || 1,
    correctOptionTempIds,
    questionText: question.QuestionText,
    skillType: sourceSection?.SkillType ?? null,
    sectionDisplayName: sourceSection?.DisplayName ?? null,
    audioUrl: resolveSectionAudio(sourceSection),
  };
}

function collectQuestionsWithSource(sections = [], skillType) {
  return getSectionsBySkill(sections, skillType).flatMap((section) =>
    getActiveFilledTestQuestions(section.Questions ?? []).map((question) => ({
      question,
      section,
    })),
  );
}

function buildSkillSection(skillType, questionsWithSource, shuffleAnswers, startOrder) {
  if (!questionsWithSource.length) return null;

  const groupsMap = new Map();
  questionsWithSource.forEach(({ question, section }) => {
    const groupId = section?.tempId ?? section?.DisplayName ?? `group_${groupsMap.size + 1}`;
    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, {
        groupId,
        displayName:
          String(section?.DisplayName ?? '').trim() ||
          `Nhóm ${groupsMap.size + 1}`,
        audioUrl: skillType === TEST_SKILL_LISTENING ? resolveSectionAudio(section) : null,
        items: [],
      });
    }
    groupsMap.get(groupId).items.push({ question, section });
  });

  let order = startOrder;
  const questionGroups = [...groupsMap.values()].map((group, index) => {
    const questions = group.items.map(({ question, section }) => {
      const studentQ = toStudentQuestion(question, order, shuffleAnswers);
      studentQ.audioUrl =
        skillType === TEST_SKILL_LISTENING ? resolveSectionAudio(section) : null;
      order += 1;
      return studentQ;
    });

    return {
      groupId: group.groupId,
      displayName: group.displayName || `Nhóm ${index + 1}`,
      audioUrl: group.audioUrl,
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

function pickWritingQuestions(config, bankSections, shuffleAnswers) {
  const groups = getWritingSectionGroupsFromConfig(config).filter((group) => group.selected);
  const picked = [];

  groups.forEach((group) => {
    const rawId = String(group.sectionTempId).includes('::')
      ? String(group.sectionTempId).split('::').pop()
      : group.sectionTempId;

    const section = bankSections.find((item) => item.tempId === rawId);
    if (!section) return;

    const pool = getActiveFilledTestQuestions(section.Questions ?? []);
    pickRandom(pool, group.questionCount).forEach((question) => {
      picked.push({ question, section });
    });
  });

  return picked;
}

function buildPaperFromBanks(config, bankList, options = {}) {
  const shuffleQuestions = config.shuffleQuestions !== false;
  const shuffleAnswers = config.shuffleAnswers !== false;
  const allSections = bankList.flatMap((bank) => bank.sections ?? []);

  const pickedBySkill = {
    [TEST_SKILL_LISTENING]: pickRandom(
      collectQuestionsWithSource(allSections, TEST_SKILL_LISTENING),
      getQuestionCountForPart(config, TEST_SKILL_LISTENING),
    ),
    [TEST_SKILL_READING]: pickRandom(
      collectQuestionsWithSource(allSections, TEST_SKILL_READING),
      getQuestionCountForPart(config, TEST_SKILL_READING),
    ),
    [TEST_SKILL_WRITING]: pickWritingQuestions(config, allSections, shuffleAnswers),
  };

  if (shuffleQuestions) {
    [TEST_SKILL_LISTENING, TEST_SKILL_READING, TEST_SKILL_WRITING].forEach((skill) => {
      pickedBySkill[skill] = shuffleArray(pickedBySkill[skill]);
    });
  }

  let order = 1;
  const paperSections = [];
  const gradingQuestions = [];

  [TEST_SKILL_LISTENING, TEST_SKILL_READING, TEST_SKILL_WRITING].forEach((skill) => {
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
      allowMultipleAnswers: question.allowMultipleAnswers,
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
  return (paper?.sections ?? []).flatMap((section) => section.questions ?? []);
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
      questions: section.questions,
    },
  ];
}
