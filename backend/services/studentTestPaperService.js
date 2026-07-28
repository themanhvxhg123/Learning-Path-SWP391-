const questionBankModel = require('../Models/questionBankModel');
const chapterQuizConfigModel = require('../Models/chapterQuizConfigModel');
const { randomizeTestPaperFromConfig } = require('./testPaperRandomService');

const SKILL_LISTENING = 'LISTENING';
const SKILL_READING = 'READING';
const SKILL_VOCABULARY = 'VOCABULARY';

function getPartConfig(config, part) {
  return (config?.questionConfigs ?? []).find((entry) => entry.part === part) ?? {};
}

function getSectionCountForPart(config, part) {
  return Math.max(0, Number(getPartConfig(config, part).sectionCount ?? 0) || 0);
}

function getSectionQuestionCountsForPart(config, part) {
  return (getPartConfig(config, part).sectionQuestionCounts ?? [])
    .map((entry) => ({
      sectionTempId: String(entry.sectionTempId ?? ''),
      questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
    }))
    .filter((entry) => entry.sectionTempId);
}

async function loadSectionsForPaths(courseId, pathIds = []) {
  const allSections = [];
  for (const pathId of pathIds) {
    const pathMeta = await chapterQuizConfigModel.getPathMeta(courseId, pathId);
    const pathName = pathMeta?.PathName ?? null;
    const pathOrder = Number(pathMeta?.PathOrder ?? 0) || null;
    const sections = await questionBankModel.getSectionsByPath(courseId, pathId);
    sections.forEach((section) => {
      allSections.push({
        ...section,
        PathId: Number(pathId),
        PathName: pathName,
        PathOrder: pathOrder,
      });
    });
  }
  return allSections;
}

function hasConfiguredQuizSources(config = {}) {
  const listening = getSectionCountForPart(config, SKILL_LISTENING);
  const reading = getSectionCountForPart(config, SKILL_READING);
  const vocabulary = getSectionQuestionCountsForPart(config, SKILL_VOCABULARY)
    .reduce((sum, entry) => sum + entry.questionCount, 0);
  return listening > 0 || reading > 0 || vocabulary > 0;
}

function hasMentorQuestionConfigs(config = {}) {
  return Array.isArray(config.questionConfigs);
}

function assertConfigHasQuizSources(config, scopeLabel = 'bài kiểm tra') {
  if (!hasMentorQuestionConfigs(config) || !hasConfiguredQuizSources(config)) {
    const error = new Error(`Mentor chưa cấu hình kỹ năng nào cho ${scopeLabel}.`);
    error.code = 'INSUFFICIENT_TEST_QUESTIONS';
    throw error;
  }
}

async function buildPaperFromConfig(config, sectionsData, options = {}) {
  return randomizeTestPaperFromConfig(config, sectionsData, {
    chapterSectionCounts: options.chapterSectionCounts ?? {},
    loadQuestionsForSection: (sectionId) => questionBankModel.getQuestionsBySection(sectionId),
  });
}

async function buildChapterTestPaper(config, sectionsData) {
  assertConfigHasQuizSources(config, 'bài kiểm tra chương');
  return buildPaperFromConfig(config, sectionsData);
}

async function buildCourseTestPaper(config, courseId) {
  assertConfigHasQuizSources(config, 'bài kiểm tra toàn khóa');

  const sectionsData = await loadCourseTestSections(courseId, config);
  return buildPaperFromConfig(config, sectionsData, {
    chapterSectionCounts: config.chapterSectionCounts ?? {},
  });
}

/** Load section ngân hàng câu hỏi cho bài test toàn khóa. */
async function loadCourseTestSections(courseId, config) {
  const selectedChapterIds = (config?.selectedChapterIds ?? [])
    .map(String)
    .filter(Boolean);

  if (selectedChapterIds.length === 0) {
    const error = new Error('Mentor chưa chọn chương nguồn câu hỏi cho bài kiểm tra toàn khóa.');
    error.code = 'INSUFFICIENT_TEST_QUESTIONS';
    throw error;
  }

  return loadSectionsForPaths(courseId, selectedChapterIds);
}

/** Random đề khi đã có sẵn config + sectionsData (sau bước đề xuất). */
async function buildCourseTestPaperWithSections(config, sectionsData) {
  assertConfigHasQuizSources(config, 'bài kiểm tra toàn khóa');
  return buildPaperFromConfig(config, sectionsData, {
    chapterSectionCounts: config.chapterSectionCounts ?? {},
  });
}

function getConfiguredSkillTypes(config = {}) {
  const skills = [];
  if (getSectionCountForPart(config, SKILL_LISTENING) > 0) skills.push(SKILL_LISTENING);
  if (getSectionCountForPart(config, SKILL_READING) > 0) skills.push(SKILL_READING);
  if (
    getSectionQuestionCountsForPart(config, SKILL_VOCABULARY)
      .some((entry) => entry.questionCount > 0)
  ) {
    skills.push(SKILL_VOCABULARY);
  }
  return skills;
}

module.exports = {
  buildChapterTestPaper,
  buildCourseTestPaper,
  buildCourseTestPaperWithSections,
  loadCourseTestSections,
  getConfiguredSkillTypes,
  hasConfiguredQuizSources,
  hasMentorQuestionConfigs,
  isSectionUseForTest: (section) => section?.IsUseForTest !== false && section?.IsUseForTest !== 0,
};
