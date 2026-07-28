/**
 * =============================================================================
 * THUẬT TOÁN ĐỀ XUẤT ĐỀ THI THÍCH ỨNG (ADAPTIVE TESTING) CHO HỌC VIÊN THI LẠI
 * 
 * MỤC ĐÍCH:
 * - Phân tích lịch sử làm bài gần nhất của học viên để tìm ra Điểm Yếu (Chương nào sai nhiều nhất).
 * - Tự động điều chỉnh cấu trúc Đề thi: Tăng số lượng câu hỏi ở Chương yếu, Giảm số câu ở Chương giỏi.
 * - Đảm bảo nguyên tắc: Tổng số câu hỏi không bao giờ vượt quá Cấu hình gốc của Giảng viên.
 * =============================================================================
 */

const DOCX = require('./testRecommendationDocx');

// --- Nạp (import) tệp giúp đọc kết quả bài làm từ cơ sở dữ liệu ---
const studentTestModel = require('../Models/studentTestModel');

// --- Nạp tệp lấy mentor config (cấu hình bài kiểm tra do mentor thiết lập) ---
const chapterQuizConfigService = require('./chapterQuizConfigService');
const SKILL_LISTENING = 'LISTENING';   // Nghe — docx: Kỹ năng Nghe
const SKILL_READING = 'READING';       // Đọc — cùng quy tắc với Nghe
const SKILL_VOCABULARY = 'VOCABULARY'; // Từ vựng / Ngữ pháp — docx: Từ Vựng/Ngữ pháp

// =============================================================================
// =============================================================================

/**
 * Hàm mapSectionStatRow: chuyển MỘT dòng dữ liệu thô từ cơ sở dữ liệu
 * thành dạng thống nhất, dễ đọc cho các hàm tính toán phía sau.
 * Cần có wrongCount (số câu sai) và totalCount (tổng câu) để tính docx Công thức 1.
 *
 * @param row - một dòng thống kê; nếu không truyền gì thì mặc định là {} (rỗng)
 */
function mapSectionStatRow(row = {}) {
  return {
    attemptSectionStatId: row.AttemptSectionStatId ?? row.attemptSectionStatId ?? null,

    attemptId: Number(row.AttemptId ?? row.attemptId) || null,

    courseId: Number(row.CourseId ?? row.courseId) || null,

    pathId: Number(row.PathId ?? row.pathId) || null,

    typeId: Number(row.TypeId ?? row.typeId) || null,

    skillType: String(row.SkillType ?? row.skillType ?? '').trim().toUpperCase() || null,

    sectionId: Number(row.SectionId ?? row.sectionId) || null,

    sectionTitle: row.SectionTitle ?? row.sectionTitle ?? null,

    correctCount: Number(row.CorrectCount ?? row.correctCount) || 0,

    wrongCount: Number(row.WrongCount ?? row.wrongCount) || 0,

    totalCount: Number(row.TotalCount ?? row.totalCount) || 0,

    createdAt: row.CreatedAt ?? row.createdAt ?? null,
  };
}

/**
 * Hàm getLatestCourseTestAttemptStats: lấy stat LẦN LÀM BÀI GẦN NHẤT.
 * Không lọc theo Status (submitted / in_progress) — lấy attempt mới nhất theo AttemptId.
 * Docx: thuật toán chỉ dựa trên lần làm gần nhất, KHÔNG gộp nhiều lần làm lại.
 *
 * async = hàm bất đồng bộ (phải chờ cơ sở dữ liệu trả dữ liệu)
 * { userId, courseId, testId } = nhận ba tham số dạng object
 */
async function getLatestCourseTestAttemptStats({ userId, courseId, testId }) {
  const safeUserId = Number(userId);
  const safeCourseId = Number(courseId);

  if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
    return { attemptId: null, sectionStats: [] };
  }

  if (!Number.isInteger(safeCourseId) || safeCourseId <= 0) {
    return { attemptId: null, sectionStats: [] };
  }

  const resolvedTestId = Number(testId)
    || await studentTestModel.getTestIdByCourseForFinal(safeCourseId);

  if (!resolvedTestId) {
    return { attemptId: null, sectionStats: [] };
  }

  const latestAttempt = await studentTestModel.getLatestAttemptByUserAndTest(
    safeUserId,
    resolvedTestId,
  );

  const latestAttemptId = Number(latestAttempt?.AttemptId);
  if (!latestAttemptId) {
    return { attemptId: null, sectionStats: [] };
  }

  const rows = await studentTestModel.getAttemptSectionStats(latestAttemptId);

  return {
    attemptId: latestAttemptId,
    sectionStats: rows.map(mapSectionStatRow),
  };
}

/**
 * Hàm getMentorCourseTestConfig: lấy mentor config GỐC.
 * Docx: "config ban đầu của Mentor" — mọi điều chỉnh sau không được vượt giới hạn mentor config này.
 */
async function getMentorCourseTestConfig(courseId) {
  const safeCourseId = Number(courseId);

  if (!Number.isInteger(safeCourseId) || safeCourseId <= 0) {
    return { ok: false, config: null, message: 'courseId không hợp lệ.' };
  }

  const result = await chapterQuizConfigService.getCourseQuizConfig(safeCourseId);

  if (!result.ok) {
    return { ok: false, config: null, message: result.message };
  }

  if (!result.config) {
    return { ok: false, config: null, message: 'Mentor chưa cấu hình bài kiểm tra toàn khóa.' };
  }

  if (!result.config.enabled) {
    return { ok: false, config: null, message: 'Bài kiểm tra toàn khóa chưa được bật.' };
  }

  return { ok: true, config: result.config };
}

// =============================================================================
// =============================================================================

/**
 * Hàm getPartConfig: tìm phần mentor config của MỘT kỹ năng (Nghe/Đọc/Từ vựng).
 */
function getPartConfig(config, part) {
  return (config?.questionConfigs ?? []).find((entry) => entry.part === part) ?? {};
}

/**
 * Hàm getSectionCount: đếm số section Nghe hoặc Đọc trong mentor config.
 * Docx Nghe ví dụ: "Gồm 5 Section (do mentor config)".
 * Docx RULE: "Tổng section sau đề xuất <= tổng section do mentor config".
 */
function getSectionCount(config, part) {
  return Math.max(0, Number(getPartConfig(config, part).sectionCount ?? 0) || 0);
}

/**
 * Hàm getVocabularyEntries: lấy danh sách section Từ vựng + questionCount mỗi section trong mentor config.
 * Docx ví dụ: "Chương 1: 13 câu, Chương 2: 17 câu, Chương 3: 19 câu".
 */
function getVocabularyEntries(config) {
  return (getPartConfig(config, SKILL_VOCABULARY).sectionQuestionCounts ?? [])
    .map((entry) => ({
      sectionTempId: String(entry.sectionTempId ?? ''),
      questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
    }))
    .filter((entry) => entry.sectionTempId && entry.questionCount > 0);
}

/**
 * Hàm parseCourseSectionTempId: tách mã section thành mã chương + mã section.
 * Ví dụ: "12::section_34" → chương 12, section 34
 */
function parseCourseSectionTempId(sectionTempId) {
  const raw = String(sectionTempId ?? '');

  const composite = raw.match(/^(\d+)::section_(\d+)$/);

  if (composite) {
    return { pathId: Number(composite[1]), sectionId: Number(composite[2]) };
  }

  const simple = raw.match(/^section_(\d+)$/);

  return { pathId: null, sectionId: simple ? Number(simple[1]) : null };
}

/** Hàm buildCourseSectionTempId: ghép mã chương và mã section thành một chuỗi */
function buildCourseSectionTempId(pathId, sectionId) {
  return `${pathId}::section_${sectionId}`;
}

/**
 * Hàm isSectionUseForTest: kiểm tra section có được dùng trong kiểm tra không.
 * Mentor có thể đánh dấu section "không dùng cho test" (IsUseForTest).
 */
function isSectionUseForTest(section) {
  return section?.IsUseForTest !== false && section?.IsUseForTest !== 0;
}

// =============================================================================
// =============================================================================

/**
 * @summary CÔNG THỨC 1: Tính tỷ lệ sai của từng Chương.
 * @description Quét qua lịch sử làm bài, chương nào có Tỷ lệ sai (Số câu sai / Tổng câu) càng cao thì Trọng số (Weight) càng lớn.
 */
function aggregateChapterWeights(sectionStats, skillType) {
  const chapters = new Map();

  for (const row of sectionStats) {
    if (row.skillType !== skillType) continue;

    const pathId = Number(row.pathId);

    if (!pathId) continue;

    const bucket = chapters.get(pathId) ?? { pathId, wrongCount: 0, totalCount: 0 };

    bucket.wrongCount += Number(row.wrongCount) || 0;

    bucket.totalCount += Number(row.totalCount) || 0;

    chapters.set(pathId, bucket);
  }

  return [...chapters.values()]
    .map((chapter) => ({
      pathId: chapter.pathId,

      weight: chapter.totalCount > 0 ? chapter.wrongCount / chapter.totalCount : 0,

      wrongCount: chapter.wrongCount,
      totalCount: chapter.totalCount,
    }))
    .sort((left, right) => left.pathId - right.pathId);
}

/**
 * Hàm allWeightsEqual — điều kiện DOCX.CASE_1 (một phần):
 *   "${DOCX.CASE_1.docxCondition}"
 *   ${DOCX.CASE_1.codeNote}
 */
function allWeightsEqual(chapters) {
  if (chapters.length <= 1) return false;

  const first = chapters[0].weight;
  return chapters.every((chapter) => Math.abs(chapter.weight - first) < 1e-9);
}

/**
 * @summary CÔNG THỨC 2: Chia bánh (Phân bổ lại số lượng phần thi).
 * @description Bơm nhiều phần thi (Section) hơn vào các Chương có Trọng số (Weight) cao. Chương nào làm đúng 100% thì cắt bỏ không cho thi lại.
 */
function allocateByWeight(chapters, totalCount) {
  const positive = chapters.filter((chapter) => chapter.weight > 0);

  if (totalCount <= 0 || positive.length === 0) return new Map();

  if (positive.length === 1) {
    return new Map([[positive[0].pathId, totalCount]]);
  }

  const weightTotal = positive.reduce((sum, chapter) => sum + chapter.weight, 0);

  const quotas = positive.map((chapter) => ({
    pathId: chapter.pathId,   // Mã chương
    weight: chapter.weight,   // weight (để sắp xếp ưu tiên khi bù)
    count: Math.floor((chapter.weight / weightTotal) * totalCount),
  }));

  let remaining = totalCount - quotas.reduce((sum, quota) => sum + quota.count, 0);

  const byWeight = [...quotas].sort(
    (left, right) => right.weight - left.weight || left.pathId - right.pathId,
  );

  for (const quota of byWeight) {
    if (remaining <= 0) break;

    quota.count += 1;

    remaining -= 1;
  }

  const allocation = new Map();

  quotas.forEach((quota) => {
    if (quota.count > 0) allocation.set(quota.pathId, quota.count);
  });

  return allocation;
}

/**
 * Hàm sanitizeSectionAllocation: loại bỏ chương được phân 0 section.
 * Docx Trường hợp 3: chương weight = 0 không xuất hiện trong đề lần sau.
 */
function sanitizeSectionAllocation(allocation) {
  const result = new Map();

  for (const [pathId, count] of allocation) {
    if (count > 0) result.set(pathId, count);
  }

  return result;
}

// =============================================================================
// =============================================================================

/**
 * Hàm recommendListeningReadingAllocation — DOCX.LISTENING_READING
 *
 * ${DOCX.LISTENING_READING.summary}
 *
 * RULE docx:
 * ${DOCX.LISTENING_READING.rules.map((r) => ` *   - ${r}`).join('\n')}
 *
 * Luồng case (theo thứ tự kiểm tra trong code):
 *   1. DOCX.CASE_1      → return null (giữ mentor config)
 *   2. DOCX.CASE_3      → lọc weight > 0; nếu rỗng → null (→ Case 1 / mentor config)
 *   3. DOCX.CASE_2      → allocateByWeight (Công thức 2)
 *   4. DOCX.EXCEPTION   → nằm trong allocateByWeight khi chỉ 1 chương weight > 0
 *   5. DOCX.BANK_RULE   → rebalanceSectionAllocation
 */
function recommendListeningReadingAllocation(
  sectionStats,   // Thống kê lần làm gần nhất
  mentorConfig,   // mentor config gốc
  skillType,      // LISTENING hoặc READING
  sectionsData = [], // Danh sách section trong question bank (mặc định rỗng)
) {
  const totalSections = getSectionCount(mentorConfig, skillType);

  if (totalSections <= 0) return null;

  const chapters = aggregateChapterWeights(sectionStats, skillType);

  if (chapters.length === 0) return null;

  if (isCase1KeepMentorConfig(chapters, mentorConfig, sectionsData, skillType)) return null;

  const positive = chapters.filter((chapter) => chapter.weight > 0);

  if (positive.length === 0) return null;

  let allocation = allocateByWeight(positive, totalSections);

  const bankByChapter = groupSkillBankByChapter(sectionsData, skillType);
  if (bankByChapter.size > 0) {
    allocation = rebalanceSectionAllocation(allocation, bankByChapter, positive);
  }

  allocation = sanitizeSectionAllocation(allocation);

  return allocation.size > 0 ? allocation : null;
}

// =============================================================================
// =============================================================================

/**
 * Hàm groupSkillBankByChapter: nhóm section trong question bank theo chương.
 * Dùng khi đối chiếu với question bank (docx RULE: chương thiếu section trong bank).
 */
function groupSkillBankByChapter(sectionsData = [], skillType) {
  const byChapter = new Map();

  for (const section of sectionsData) {
    if (section.SkillType !== skillType || !isSectionUseForTest(section)) continue;

    const pathId = Number(section.PathId ?? section.pathId);

    if (!pathId) continue;

    if (!byChapter.has(pathId)) {
      byChapter.set(pathId, []);
    }

    byChapter.get(pathId).push(section);
  }

  return byChapter;
}

/** Lấy danh sách pathId chương mentor chọn cho bài test toàn khóa. */
function getSelectedChapterIds(mentorConfig) {
  return (mentorConfig?.selectedChapterIds ?? [])
    .map(String)
    .filter(Boolean);
}

/**
 * Chương eligible cho một kỹ năng:
 *   selectedChapterIds ∩ chương có ≥ 1 section skill đó trong question bank (IsUseForTest).
 * Chương không có bank (vd. Ch4) không nằm trong tập này.
 */
function getEligibleChapterIdsForSkill(mentorConfig, sectionsData, skillType) {
  const selected = new Set(getSelectedChapterIds(mentorConfig));
  const bankByChapter = groupSkillBankByChapter(sectionsData, skillType);

  return [...bankByChapter.keys()]
    .filter((pathId) => selected.has(String(pathId)))
    .map(Number)
    .filter((pathId) => Number.isInteger(pathId) && pathId > 0)
    .sort((left, right) => left - right);
}

/**
 * Docx Case 1 — "số chương trong Test có đầy đủ":
 * mọi chương eligible đều xuất hiện trong stat lần làm gần nhất.
 */
function hasFullChapterCoverageForSkill(chapters, eligibleChapterIds) {
  if (eligibleChapterIds.length === 0) return false;

  const statChapterIds = new Set(chapters.map((chapter) => String(chapter.pathId)));
  return eligibleChapterIds.every((pathId) => statChapterIds.has(String(pathId)));
}

/**
 * Hàm isCase1KeepMentorConfig — DOCX.CASE_1
 *
 * Docx: "${DOCX.CASE_1.docxCondition}"
 * Docx: "${DOCX.CASE_1.docxAction}"
 *
 * Code thêm: ${DOCX.CASE_1.codeCondition}
 */
function isCase1KeepMentorConfig(chapters, mentorConfig, sectionsData, skillType) {
  if (chapters.length <= 1) return false;

  const eligibleChapterIds = getEligibleChapterIdsForSkill(
    mentorConfig,
    sectionsData,
    skillType,
  );

  if (!hasFullChapterCoverageForSkill(chapters, eligibleChapterIds)) {
    return false;
  }

  return allWeightsEqual(chapters);
}

/**
 * Hàm groupVocabularyBankByChapter: nhóm section Từ vựng theo chương,
 * kèm số câu thực có trong question bank.
 * Docx: "số câu không được vượt quá tổng câu trong Question Bank".
 */
function groupVocabularyBankByChapter(sectionsData = []) {
  const byChapter = new Map();

  const rawByChapter = groupSkillBankByChapter(sectionsData, SKILL_VOCABULARY);

  for (const [pathId, pool] of rawByChapter) {
    byChapter.set(pathId, pool.map((item) => ({
      pathId, // Mã chương
      sectionId: Number(item.SectionId), // Mã section
      sectionTempId: buildCourseSectionTempId(pathId, item.SectionId),
      availableCount: Number(item.QuestionCount ?? item.questionCount ?? 0) || 0,
    })));
  }

  return byChapter;
}

/**
 * Hàm buildMentorVocabularyChapterSummary: tổng hợp phần Từ vựng trong mentor config theo chương.
 * Docx: "Chương 1: 13 câu, Chương 2: 17 câu, Chương 3: 19 câu (tổng 49 câu)".
 */
function buildMentorVocabularyChapterSummary(mentorConfig) {
  const entries = getVocabularyEntries(mentorConfig);

  const byChapter = new Map();

  for (const entry of entries) {
    const parsed = parseCourseSectionTempId(entry.sectionTempId);
    const pathId = parsed.pathId;

    if (!pathId) continue;

    if (!byChapter.has(pathId)) {
      byChapter.set(pathId, { pathId, mentorSectionCount: 0, mentorQuestionCount: 0 });
    }

    const bucket = byChapter.get(pathId);

    bucket.mentorSectionCount += 1;

    bucket.mentorQuestionCount += entry.questionCount;
  }

  return {
    totalSections: entries.length,
    byChapter,
  };
}

/**
 * Hàm rebalanceSectionAllocation — DOCX.BANK_RULE
 * ${DOCX.BANK_RULE.docxSteps.join('\n * ')}
 */


// Thuật toán tính ra một đằng, nhưng trong Kho (Database) lại không có đủ câu hỏi để đáp ứng
// Thuật toán tính ra Chương 2 học sinh sai nhiều quá, nên yêu cầu 5 Section Chương 2. Nhưng khổ nỗi, Giáo viên mới chỉ nhập vào Kho (Database) có 3 Section Chương 2. Giải quyết: Hàm này sẽ "ép" số lượng xuống còn tối đa là 3
function rebalanceSectionAllocation(allocation, bankByChapter, chaptersByWeight) {
  const result = new Map(allocation);

  let deficit = 0;

  // --- Bước 1 docx: cắt nếu phân nhiều hơn số section có trong question bank ---
  for (const [pathId, count] of result) {
    const available = (bankByChapter.get(pathId) ?? []).length;

    if (count > available) {
      result.set(pathId, available);

      deficit += count - available;
    }
  }

  if (deficit <= 0) return result;

  // --- Bước 2 docx: bù theo weight từ cao xuống thấp ---
  const priority = [...chaptersByWeight].sort(
    (left, right) => right.weight - left.weight || left.pathId - right.pathId,
  );

  for (const chapter of priority) {
    if (deficit <= 0) break;

    const pathId = chapter.pathId;

    const available = (bankByChapter.get(pathId) ?? []).length;

    const current = result.get(pathId) ?? 0;

    const canAdd = Math.max(0, available - current);

    if (canAdd <= 0) continue;

    const add = Math.min(canAdd, deficit);

    result.set(pathId, current + add);

    deficit -= add;
  }

  return result;
}

/**
 * Hàm pickRandomSections — DOCX: "Lấy random nếu đủ section trong question bank"
 * Xáo trộn danh sách section rồi lấy đủ số lượng cần.
 */
function pickRandomSections(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Hàm distributeQuestionsAcrossSections — DOCX.VOCABULARY.steps.step4
 *
 * Docx bước 4: "Chia đều số câu hỏi cho các section"
 * "Phần thiếu → lấy ở section có nhiều câu hỏi nhất trong question bank"
 *
 * Ví dụ docx (DOCX.VOCABULARY.steps.step4.distribution):
 *   Ch1: 5 section, 13 câu → floor 2/section, bù 3 câu
 *   Ch2: 3 section, 17 câu → floor 5/section, bù 2 câu
 *   Ch3: 4 section, 19 câu → floor 4/section, bù 3 câu
 */
function distributeQuestionsAcrossSections(sections, totalQuestions) {
  if (sections.length === 0 || totalQuestions <= 0) return [];

  const base = Math.floor(totalQuestions / sections.length);

  const plan = sections.map((section) => ({
    sectionTempId: section.sectionTempId, // Mã section
    questionCount: Math.min(base, section.availableCount),
    availableCount: section.availableCount, // Giữ để biết còn chỗ bù thêm không
  }));

  let remaining = totalQuestions - plan.reduce((sum, entry) => sum + entry.questionCount, 0);

  const byAvailability = [...plan].sort(
    (left, right) => right.availableCount - left.availableCount
      || left.sectionTempId.localeCompare(right.sectionTempId),
  );

  for (const entry of byAvailability) {
    if (remaining <= 0) break;

    if (entry.questionCount >= entry.availableCount) continue;

    entry.questionCount += 1;

    remaining -= 1;
  }

  return plan
    .filter((entry) => entry.questionCount > 0)
    .map(({ sectionTempId, questionCount }) => ({ sectionTempId, questionCount }));
}

/**
 * Hàm recommendVocabularyPlan — DOCX.VOCABULARY (4 bước)
 *
 * Bước 1 (DOCX.VOCABULARY.steps.step1): Công thức 1 — tính weight từng chương
 * Bước 2 (DOCX.VOCABULARY.steps.step2): Xếp ưu tiên weight cao → thấp
 * Bước 3 (DOCX.VOCABULARY.steps.step3): Công thức 2 → { Ch1:5, Ch2:3, Ch3:4 } + BANK_RULE
 * Bước 4 (DOCX.VOCABULARY.steps.step4): pickRandomSections + distributeQuestionsAcrossSections
 *
 * Case (cùng thứ tự Nghe/Đọc):
 *   DOCX.CASE_1 → null | DOCX.CASE_3 → lọc positive | DOCX.CASE_2 → allocateByWeight
 *
 * RULE: ${DOCX.VOCABULARY.rules.join(' | ')}
 */
function recommendVocabularyPlan(sectionStats, mentorConfig, sectionsData = []) {
  const mentorSummary = buildMentorVocabularyChapterSummary(mentorConfig);

  const { totalSections, byChapter: mentorByChapter } = mentorSummary;

  if (totalSections <= 0) return null;

  // --- DOCX BƯỚC 1: tính weight từng chương ---
  const chapters = aggregateChapterWeights(sectionStats, SKILL_VOCABULARY);

  if (chapters.length === 0) return null;

  if (isCase1KeepMentorConfig(chapters, mentorConfig, sectionsData, SKILL_VOCABULARY)) {
    return null;
  }

  const positive = chapters.filter((chapter) => chapter.weight > 0);

  if (positive.length === 0) return null;

  const bankByChapter = groupVocabularyBankByChapter(sectionsData);

  let sectionAllocation = allocateByWeight(positive, totalSections);

  sectionAllocation = rebalanceSectionAllocation(sectionAllocation, bankByChapter, positive);

  sectionAllocation = sanitizeSectionAllocation(sectionAllocation);

  if (sectionAllocation.size === 0) return null;

  const vocabularyPlan = [];

  for (const [pathId, sectionCount] of sectionAllocation) {
    if (sectionCount <= 0) continue;

    const mentorChapter = mentorByChapter.get(pathId);

    const mentorQuestionCount = mentorChapter?.mentorQuestionCount ?? 0;

    const pool = bankByChapter.get(pathId) ?? [];

    const picked = pickRandomSections(pool, sectionCount);

    const questionPlan = distributeQuestionsAcrossSections(picked, mentorQuestionCount);

    vocabularyPlan.push(...questionPlan);
  }

  return vocabularyPlan.length > 0 ? vocabularyPlan : null;
}

// =============================================================================
// =============================================================================

/**
 * Hàm recommendCourseTestFromStats — gom Nghe + Đọc + Từ vựng theo docx.
 *
 * Trả mentor config gốc khi:
 *   - Không có stat (lần đầu / chưa có dữ liệu)
 *   - DOCX.CASE_1 (mọi kỹ năng đều null)
 *   - DOCX.EXCEPTION nhánh weight=0 (positive rỗng → null)
 *
 * Trả config mới khi có DOCX.CASE_2 / EXCEPTION (weight>0) / BANK_RULE.
 */
function recommendCourseTestFromStats(sectionStats, mentorConfig, sectionsData = []) {
  if (!Array.isArray(sectionStats) || sectionStats.length === 0 || !mentorConfig) {
    return mentorConfig;
  }

  const nextConfig = JSON.parse(JSON.stringify(mentorConfig));

  const chapterSectionCounts = {};

  let hasRecommendation = false;

  // --- Docx Nghe/Đọc: cùng quy tắc, tính RIÊNG từng kỹ năng ---
  for (const skillType of [SKILL_LISTENING, SKILL_READING]) {
    const allocation = recommendListeningReadingAllocation(
      sectionStats,
      mentorConfig,
      skillType,
      sectionsData,
    );

    if (allocation && allocation.size > 0) {
      chapterSectionCounts[skillType] = allocation;
      hasRecommendation = true;
    }
  }

  // --- Docx Từ vựng: 4 bước ---
  const vocabularyPlan = recommendVocabularyPlan(sectionStats, mentorConfig, sectionsData);

  if (vocabularyPlan) {
    nextConfig.vocabularyPlan = vocabularyPlan;
    hasRecommendation = true;
  }

  if (Object.keys(chapterSectionCounts).length > 0) {
    nextConfig.chapterSectionCounts = chapterSectionCounts;
  }

  return hasRecommendation ? nextConfig : mentorConfig;
}

// =============================================================================
// =============================================================================

/**
 * Hàm resolveCourseTestPaperConfig — kiểm tra trước khi tạo đề:
 *   - Lần đầu (chưa có attempt nào) → dùng mentor config, KHÔNG chạy thuật toán docx
 *   - Lần 2 trở đi (đã có attempt trước, mọi status) → chạy thuật toán docx
 */
async function resolveCourseTestPaperConfig({ userId, courseId, testId }) {
  const mentorResult = await getMentorCourseTestConfig(courseId);

  if (!mentorResult.ok) {
    return { ok: false, message: mentorResult.message };
  }

  const mentorConfig = mentorResult.config;

  const resolvedTestId = Number(testId) || Number(mentorConfig.id);

  if (!resolvedTestId) {
    return { ok: false, message: 'Giảng viên chưa tạo bài kiểm tra toàn khóa!' };
  }

  const attemptCount = await studentTestModel.getAttemptCountByUserAndTest(
    userId,
    resolvedTestId,
  );

  return {
    ok: true,
    config: mentorConfig,
    testId: resolvedTestId,
    hasSubmittedBefore: attemptCount > 0,
  };
}

/**
 * @summary TRÁI TIM CỦA HỆ THỐNG: Xây dựng Đề thi Thích ứng (Adaptive Test) cho người thi lại.
 * @description Chạy các thuật toán phân tích điểm yếu (Nghe, Đọc, Từ vựng) rồi tiến hành bốc random câu hỏi theo Cấu hình mới đã được tối ưu hóa.
 */
async function buildRecommendedCourseTestPaper({ userId, courseId, mentorConfig, testId }) {
  const studentTestPaperService = require('./studentTestPaperService');

  const { sectionStats } = await getLatestCourseTestAttemptStats({
    userId,
    courseId,
    testId,
  });

  const sectionsData = await studentTestPaperService.loadCourseTestSections(courseId, mentorConfig);

  const paperConfig = sectionStats.length > 0
    ? recommendCourseTestFromStats(sectionStats, mentorConfig, sectionsData)
    : mentorConfig;

  return studentTestPaperService.buildCourseTestPaperWithSections(paperConfig, sectionsData);
}

module.exports = {
  getLatestCourseTestAttemptStats,
  getMentorCourseTestConfig,
  recommendCourseTestFromStats,
  resolveCourseTestPaperConfig,
  buildRecommendedCourseTestPaper,
  /** Nội dung docx gốc — tra cứu case / công thức */
  DOCX,
  explainCase: DOCX.explainCase,
};
