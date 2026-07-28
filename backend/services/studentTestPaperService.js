const questionBankModel = require('../Models/questionBankModel');
const chapterQuizConfigModel = require('../Models/chapterQuizConfigModel');
const { randomizeTestPaperFromConfig } = require('./testPaperRandomService');

const SKILL_LISTENING = 'LISTENING';
const SKILL_READING = 'READING';
const SKILL_VOCABULARY = 'VOCABULARY';
// ============================================================================
// PHẦN 1: CÁC HÀM TIỆN ÍCH (UTILITIES) ĐỌC CẤU HÌNH TỪ MENTOR
// ============================================================================

/**
 * @summary Lấy cấu hình chi tiết của một Kỹ năng (Nghe, Đọc, Từ Vựng).
 */
function getPartConfig(config, part) {
  return (config?.questionConfigs ?? []).find((entry) => entry.part === part) ?? {};
}

/**
 * @summary Đếm số lượng Section (Đoạn văn/Audio) được yêu cầu cho phần Nghe/Đọc.
 */
function getSectionCountForPart(config, part) {
  return Math.max(0, Number(getPartConfig(config, part).sectionCount ?? 0) || 0);
}

/**
 * @summary Đếm số lượng câu hỏi Từ vựng cần bốc ra từ từng Section cụ thể.
 */
function getSectionQuestionCountsForPart(config, part) {
  return (getPartConfig(config, part).sectionQuestionCounts ?? [])
    .map((entry) => ({
      sectionTempId: String(entry.sectionTempId ?? ''),
      questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
    }))
    .filter((entry) => entry.sectionTempId);
}

// ============================================================================
// PHẦN 2: CÁC HÀM XỬ LÝ DATABASE (DATA FETCHING)
// ============================================================================

/**
 * @summary Load toàn bộ kho câu hỏi của nhiều Chương cùng lúc (Dành cho thi Final).
 * @description Quét qua từng chương (path), lấy Meta (Tên chương, Thứ tự) và đính kèm vào từng Section câu hỏi.
 */
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


// ============================================================================
// PHẦN 3: CÁC HÀM KIỂM TRA ĐIỀU KIỆN (VALIDATION)
// ============================================================================

/**
 * @summary Kiểm tra xem Mentor có cấu hình số lượng câu hỏi > 0 cho kỹ năng nào không?
 */
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


/**
 * @summary Chốt chặn an toàn: Bắn ra LỖI NGAY LẬP TỨC nếu Đề thi bị rỗng.
 * @description Ngăn chặn việc tạo ra một bài test không có câu hỏi nào (Tránh bug sập Web).
 */
function assertConfigHasQuizSources(config, scopeLabel = 'bài kiểm tra') {
  if (!hasMentorQuestionConfigs(config) || !hasConfiguredQuizSources(config)) {
    const error = new Error(`Mentor chưa cấu hình kỹ năng nào cho ${scopeLabel}.`);
    error.code = 'INSUFFICIENT_TEST_QUESTIONS';
    throw error;
  }
}


// ============================================================================
// PHẦN 4: CHỨC NĂNG CỐT LÕI - GỌI THUẬT TOÁN RANDOM ĐỂ BUILD ĐỀ
// ============================================================================

/**
 * @summary Hàm cốt lõi: Đẩy cấu hình và Ngân hàng câu hỏi vào Máy trộn (Randomizer).
 */
async function buildPaperFromConfig(config, sectionsData, options = {}) {
  return randomizeTestPaperFromConfig(config, sectionsData, {
    chapterSectionCounts: options.chapterSectionCounts ?? {},
    loadQuestionsForSection: (sectionId) => questionBankModel.getQuestionsBySection(sectionId),
  });
}


/**
 * @summary Build Đề Thi Chương (Chapter Test).
 */
async function buildChapterTestPaper(config, sectionsData) {
  assertConfigHasQuizSources(config, 'bài kiểm tra chương');
  return buildPaperFromConfig(config, sectionsData);
}

/**
 * @summary Build Đề Thi Cuối Khóa (Final Test - Thi lần đầu).
 */
async function buildCourseTestPaper(config, courseId) {
  assertConfigHasQuizSources(config, 'bài kiểm tra toàn khóa');

  const sectionsData = await loadCourseTestSections(courseId, config);
  return buildPaperFromConfig(config, sectionsData, {
    chapterSectionCounts: config.chapterSectionCounts ?? {},
  });
}


/** 
 * @summary Load section ngân hàng câu hỏi cho bài test toàn khóa. 
 * @description Chỉ load câu hỏi từ những Chương mà Mentor đã tick chọn trước đó.
 */
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
/** 
 * @summary Build Đề Thi Gợi Ý (Dành cho học viên Thi Lại).
 * @description Random đề khi đã có sẵn config bị bóp méo (sau bước phân tích điểm yếu). 
 */
async function buildCourseTestPaperWithSections(config, sectionsData) {
  assertConfigHasQuizSources(config, 'bài kiểm tra toàn khóa');
  return buildPaperFromConfig(config, sectionsData, {
    chapterSectionCounts: config.chapterSectionCounts ?? {},
  });
}

/**
 * @summary Nhận diện xem đề thi này gồm bao nhiêu kỹ năng (Nghe, Đọc hay Từ vựng).
 */
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
