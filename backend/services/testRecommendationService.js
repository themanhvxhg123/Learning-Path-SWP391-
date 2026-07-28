/**
 * =============================================================================
 * TỆP: testRecommendationService.js
 * TÀI LIỆU GỐC: Thuật toán đề xuất câu hỏi.docx
 *               (nội dung docx → testRecommendationDocx.js)
 *
 * MỤC ĐÍCH CỦA TỆP NÀY:
 *   - Lần đầu học viên làm bài kiểm tra cuối khóa → dùng đúng mentor config.
 *   - Từ lần thứ 2 trở đi → hệ thống đọc kết quả lần làm GẦN NHẤT,
 *     chương sai nhiều thì lần sau được nhiều section Nghe/Đọc hoặc nhiều câu Từ vựng hơn.
 *
 * ÁNH XẠ DOCX → CODE (chi tiết từng case xem testRecommendationDocx.js):
 *   Công thức 1           → aggregateChapterWeights       (DOCX.FORMULA_1)
 *   Công thức 2           → allocateByWeight              (DOCX.FORMULA_2)
 *   Trường hợp 1          → isCase1KeepMentorConfig       (DOCX.CASE_1)
 *   Trường hợp 2          → allocateByWeight              (DOCX.CASE_2)
 *   Trường hợp 3          → lọc positive (weight > 0)     (DOCX.CASE_3)
 *   Trường hợp Exception  → allocateByWeight (1 chương)    (DOCX.EXCEPTION)
 *   RULE question bank    → rebalanceSectionAllocation    (DOCX.BANK_RULE)
 *   Nghe/Đọc              → recommendListeningReadingAllocation (DOCX.LISTENING_READING)
 *   Từ vựng bước 1–4      → recommendVocabularyPlan       (DOCX.VOCABULARY)
 *   Từ vựng bước 4        → distributeQuestionsAcrossSections
 *   Chọn section random   → pickRandomSections
 *
 * LƯU Ý THUẬT NGỮ (giữ nguyên từ đặc thù, không dịch sang tiếng Việt):
 *   question bank, section, weight, mentor config, path (chương), skillType, floor, config
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
// PHẦN 1: ĐỌC KẾT QUẢ BÀI LÀM (đầu vào cho thuật toán trong docx)
// =============================================================================

/**
 * Hàm mapSectionStatRow: chuyển MỘT dòng dữ liệu thô từ cơ sở dữ liệu
 * thành dạng thống nhất, dễ đọc cho các hàm tính toán phía sau.
 * Cần có wrongCount (số câu sai) và totalCount (tổng câu) để tính docx Công thức 1.
 *
 * @param row - một dòng thống kê; nếu không truyền gì thì mặc định là {} (rỗng)
 */
function mapSectionStatRow(row = {}) {
  // return { ... } = trả về một "gói" thông tin đã chuẩn hóa
  return {
    // Mã bản ghi thống kê — chỉ để tham chiếu, không dùng khi tính thuật toán
    // ?? nghĩa là: lấy giá trị bên trái; nếu null/undefined thì lấy bên phải
    attemptSectionStatId: row.AttemptSectionStatId ?? row.attemptSectionStatId ?? null,

    // Mã lần làm bài — biết kết quả này thuộc lần làm thứ mấy
    // Number(...) chuyển sang số; || null nghĩa là nếu = 0 thì coi như không có
    attemptId: Number(row.AttemptId ?? row.attemptId) || null,

    // Mã khóa học
    courseId: Number(row.CourseId ?? row.courseId) || null,

    // Mã chương — docx: Chương 1, Chương 2, Chương 3
    pathId: Number(row.PathId ?? row.pathId) || null,

    // Loại nội dung (ví dụ loại section) — ít dùng khi tính thuật toán
    typeId: Number(row.TypeId ?? row.typeId) || null,

    // Kỹ năng: Nghe / Đọc / Từ vựng
    // String(...) → .trim() bỏ khoảng trắng → .toUpperCase() viết hoa để so sánh thống nhất
    skillType: String(row.SkillType ?? row.skillType ?? '').trim().toUpperCase() || null,

    // Mã section trong question bank
    sectionId: Number(row.SectionId ?? row.sectionId) || null,

    // Tên section — chỉ để hiển thị, không dùng khi tính
    sectionTitle: row.SectionTitle ?? row.sectionTitle ?? null,

    // Số câu trả lời đúng — docx không dùng trực tiếp, chỉ lưu tham khảo
    correctCount: Number(row.CorrectCount ?? row.correctCount) || 0,

    // Số câu trả lời SAI — docx Công thức 1: TỬ SỐ (phần trên của phép chia)
    wrongCount: Number(row.WrongCount ?? row.wrongCount) || 0,

    // Tổng số câu đã làm — docx Công thức 1: MẪU SỐ (phần dưới của phép chia)
    totalCount: Number(row.TotalCount ?? row.totalCount) || 0,

    // Thời điểm ghi nhận — không dùng khi tính đề xuất
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
  // Ép mã học viên sang dạng số để kiểm tra hợp lệ
  const safeUserId = Number(userId);
  // Ép mã khóa học sang dạng số
  const safeCourseId = Number(courseId);

  // Kiểm tra mã học viên: phải là số nguyên dương (1, 2, 3, ...)
  // Number.isInteger = có phải số nguyên không
  // Nếu không hợp lệ → không tính được → trả về rỗng
  if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
    // attemptId: null = chưa xác định được lần làm
    // sectionStats: [] = danh sách thống kê rỗng
    return { attemptId: null, sectionStats: [] };
  }

  // Kiểm tra mã khóa học tương tự
  if (!Number.isInteger(safeCourseId) || safeCourseId <= 0) {
    return { attemptId: null, sectionStats: [] };
  }

  // Tìm mã bài kiểm tra cuối khóa:
  // - Nếu đã truyền testId thì dùng luôn
  // - Nếu không, gọi cơ sở dữ liệu tìm theo courseId
  // await = chờ kết quả trả về trước khi chạy tiếp
  const resolvedTestId = Number(testId)
    || await studentTestModel.getTestIdByCourseForFinal(safeCourseId);

  // Không tìm thấy bài kiểm tra cuối khóa → trả rỗng
  if (!resolvedTestId) {
    return { attemptId: null, sectionStats: [] };
  }

  // Lấy attempt mới nhất (submitted hoặc in_progress) — ORDER BY AttemptId DESC
  const latestAttempt = await studentTestModel.getLatestAttemptByUserAndTest(
    safeUserId,
    resolvedTestId,
  );

  const latestAttemptId = Number(latestAttempt?.AttemptId);
  if (!latestAttemptId) {
    return { attemptId: null, sectionStats: [] };
  }

  // Stat section của đúng attempt đó (có thể rỗng nếu chưa lưu stat)
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
  // Ép courseId sang số
  const safeCourseId = Number(courseId);

  // courseId không hợp lệ → báo lỗi
  if (!Number.isInteger(safeCourseId) || safeCourseId <= 0) {
    // ok: false = thất bại; config: null = không có cấu hình; message = lý do
    return { ok: false, config: null, message: 'courseId không hợp lệ.' };
  }

  // Gọi dịch vụ lấy cấu hình bài kiểm tra toàn khóa
  const result = await chapterQuizConfigService.getCourseQuizConfig(safeCourseId);

  // Dịch vụ báo lỗi → trả lỗi kèm thông báo
  if (!result.ok) {
    return { ok: false, config: null, message: result.message };
  }

  // Không có object config → mentor chưa thiết lập mentor config
  if (!result.config) {
    return { ok: false, config: null, message: 'Mentor chưa cấu hình bài kiểm tra toàn khóa.' };
  }

  // Bài kiểm tra chưa được bật (enabled = false)
  if (!result.config.enabled) {
    return { ok: false, config: null, message: 'Bài kiểm tra toàn khóa chưa được bật.' };
  }

  // Mọi thứ ổn → trả cấu hình thành công
  return { ok: true, config: result.config };
}

// =============================================================================
// PHẦN 2: ĐỌC MENTOR CONFIG (docx: config ban đầu của Mentor)
// =============================================================================

/**
 * Hàm getPartConfig: tìm phần mentor config của MỘT kỹ năng (Nghe/Đọc/Từ vựng).
 */
function getPartConfig(config, part) {
  // config?.questionConfigs = lấy mảng cấu hình (?. tránh lỗi nếu config null)
  // ?? [] = nếu không có thì dùng mảng rỗng
  // .find = tìm phần tử có entry.part trùng part (kỹ năng cần tìm)
  // ?? {} = không tìm thấy thì trả object rỗng
  return (config?.questionConfigs ?? []).find((entry) => entry.part === part) ?? {};
}

/**
 * Hàm getSectionCount: đếm số section Nghe hoặc Đọc trong mentor config.
 * Docx Nghe ví dụ: "Gồm 5 Section (do mentor config)".
 * Docx RULE: "Tổng section sau đề xuất <= tổng section do mentor config".
 */
function getSectionCount(config, part) {
  // getPartConfig(...).sectionCount = số section mentor config chọn
  // Number(...) || 0 = ép sang số; không hợp lệ thì = 0
  // Math.max(0, ...) = không cho âm (tối thiểu là 0)
  return Math.max(0, Number(getPartConfig(config, part).sectionCount ?? 0) || 0);
}

/**
 * Hàm getVocabularyEntries: lấy danh sách section Từ vựng + questionCount mỗi section trong mentor config.
 * Docx ví dụ: "Chương 1: 13 câu, Chương 2: 17 câu, Chương 3: 19 câu".
 */
function getVocabularyEntries(config) {
  return (getPartConfig(config, SKILL_VOCABULARY).sectionQuestionCounts ?? [])
    // .map = biến từng mục thành dạng gọn
    .map((entry) => ({
      // Mã tạm của section (dạng chuỗi, ví dụ "1::section_5")
      sectionTempId: String(entry.sectionTempId ?? ''),
      // questionCount mentor config đặt cho section này; không âm
      questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
    }))
    // .filter = chỉ giữ section có mã hợp lệ VÀ số câu > 0
    .filter((entry) => entry.sectionTempId && entry.questionCount > 0);
}

/**
 * Hàm parseCourseSectionTempId: tách mã section thành mã chương + mã section.
 * Ví dụ: "12::section_34" → chương 12, section 34
 */
function parseCourseSectionTempId(sectionTempId) {
  // Ép sang chuỗi; null/undefined thì thành chuỗi rỗng
  const raw = String(sectionTempId ?? '');

  // .match(...) = so khớp theo mẫu (regex)
  // ^(\d+)::section_(\d+)$ = dạng "số::section_số"
  const composite = raw.match(/^(\d+)::section_(\d+)$/);

  // Nếu khớp dạng đầy đủ (có mã chương)
  if (composite) {
    // composite[1] = nhóm số đầu (chương); composite[2] = nhóm số sau (section)
    return { pathId: Number(composite[1]), sectionId: Number(composite[2]) };
  }

  // Thử dạng đơn giản chỉ có "section_số" (không ghi chương)
  const simple = raw.match(/^section_(\d+)$/);

  // pathId: null = không biết chương; sectionId = mã section nếu khớp, null nếu không
  return { pathId: null, sectionId: simple ? Number(simple[1]) : null };
}

/** Hàm buildCourseSectionTempId: ghép mã chương và mã section thành một chuỗi */
function buildCourseSectionTempId(pathId, sectionId) {
  // Template string `${...}` = nối biến vào chuỗi
  return `${pathId}::section_${sectionId}`;
}

/**
 * Hàm isSectionUseForTest: kiểm tra section có được dùng trong kiểm tra không.
 * Mentor có thể đánh dấu section "không dùng cho test" (IsUseForTest).
 */
function isSectionUseForTest(section) {
  // section?.IsUseForTest = lấy cờ an toàn
  // !== false VÀ !== 0 nghĩa là: chỉ coi là "không dùng" khi rõ ràng = false hoặc = 0
  return section?.IsUseForTest !== false && section?.IsUseForTest !== 0;
}

// =============================================================================
// PHẦN 3: CÔNG THỨC TÍNH VÀ CHIA BÀI (docx: Công thức 1, 2 + Trường hợp 1–3)
// =============================================================================

/**
 * Hàm aggregateChapterWeights — DOCX.FORMULA_1
 * @see testRecommendationDocx.js — DOCX.FORMULA_1
 *
 * Ví dụ docx Nghe (DOCX.FORMULA_1.examples.listening):
 *   Ch1: 7/20 = 0.35 | Ch2: 7/10 = 0.7 | Ch3: 12/20 = 0.6
 *
 * Ví dụ docx Từ vựng (DOCX.FORMULA_1.examples.vocabulary):
 *   Ch1: 7/13 ≈ 0.54 | Ch2: 8/17 ≈ 0.47 | Ch3: 10/19 ≈ 0.53
 */
function aggregateChapterWeights(sectionStats, skillType) {
  // Map = bảng tra cứu: mỗi mã chương → một "ô" chứa tổng câu sai và tổng câu
  const chapters = new Map();

  // Duyệt từng dòng thống kê trong danh sách
  for (const row of sectionStats) {
    // Nếu kỹ năng không khớp (vd đang tính Nghe mà dòng là Đọc) → bỏ qua, sang dòng tiếp
    if (row.skillType !== skillType) continue;

    // Lấy mã chương dạng số
    const pathId = Number(row.pathId);

    // Không có mã chương hợp lệ → bỏ qua
    if (!pathId) continue;

    // Lấy "ô" đã có của chương này; nếu chưa có thì tạo mới với wrongCount=0, totalCount=0
    const bucket = chapters.get(pathId) ?? { pathId, wrongCount: 0, totalCount: 0 };

    // Cộng dồn số câu sai của dòng này vào ô chương (docx: tử số)
    bucket.wrongCount += Number(row.wrongCount) || 0;

    // Cộng dồn tổng câu của dòng này vào ô chương (docx: mẫu số)
    bucket.totalCount += Number(row.totalCount) || 0;

    // Ghi lại ô đã cập nhật vào Map
    chapters.set(pathId, bucket);
  }

  // [...chapters.values()] = biến các ô trong Map thành mảng
  return [...chapters.values()]
    // .map = với mỗi chương, tính weight theo Công thức 1
    .map((chapter) => ({
      pathId: chapter.pathId,

      // weight = tỷ lệ sai (docx Công thức 1)
      // Nếu totalCount = 0 (không có câu) → weight = 0 → docx Trường hợp 3: chương không xuất hiện
      weight: chapter.totalCount > 0 ? chapter.wrongCount / chapter.totalCount : 0,

      // Giữ lại tổng câu sai và tổng câu để debug / hiển thị
      wrongCount: chapter.wrongCount,
      totalCount: chapter.totalCount,
    }))
    // Sắp xếp theo mã chương tăng dần (Ch1, Ch2, Ch3...)
    .sort((left, right) => left.pathId - right.pathId);
}

/**
 * Hàm allWeightsEqual — điều kiện DOCX.CASE_1 (một phần):
 *   "${DOCX.CASE_1.docxCondition}"
 *   ${DOCX.CASE_1.codeNote}
 */
function allWeightsEqual(chapters) {
  // DOCX.EXCEPTION: chỉ 1 chương trong stat → không phải Case 1
  if (chapters.length <= 1) return false;

  const first = chapters[0].weight;
  return chapters.every((chapter) => Math.abs(chapter.weight - first) < 1e-9);
}

/**
 * Hàm allocateByWeight — DOCX.FORMULA_2 + CASE_2 + CASE_3 + EXCEPTION
 *
 * DOCX.FORMULA_2.formula
 * DOCX.FORMULA_2.rounding
 *
 * Ví dụ docx Case 2 Nghe (DOCX.FORMULA_2.exampleListening.result):
 *   5 section mentor → kết quả { Ch1: 1, Ch2: 3, Ch3: 1 }
 *
 * DOCX.CASE_3.docxAction — lọc positive (weight > 0) trước khi chia.
 * DOCX.EXCEPTION.docxBranches[0] — positive.length === 1 → giao hết totalCount section.
 */
function allocateByWeight(chapters, totalCount) {
  // ── DOCX.CASE_3 ── "${DOCX.CASE_3.docxAction}"
  // .filter = lọc bỏ chương weight = 0 (không xuất hiện lần sau)
  const positive = chapters.filter((chapter) => chapter.weight > 0);

  // Không có section cần chia (totalCount <= 0) HOẶC không còn chương nào sai
  // → trả Map rỗng (không phân bổ gì)
  if (totalCount <= 0 || positive.length === 0) return new Map();

  // ── DOCX.EXCEPTION ── "${DOCX.EXCEPTION.docxBranches[0].then}"
  if (positive.length === 1) {
    // Giao TOÀN BỘ totalCount section cho chương đó
    // new Map([[key, value]]) = tạo bảng phân bổ một dòng
    return new Map([[positive[0].pathId, totalCount]]);
  }

  // Tính TỔNG weight của các chương còn lại — mẫu số Công thức 2
  // .reduce = cộng dồn: sum bắt đầu = 0, mỗi vòng cộng thêm chapter.weight
  const weightTotal = positive.reduce((sum, chapter) => sum + chapter.weight, 0);

  // Với mỗi chương, tính số section ban đầu (làm tròn XUỐNG — docx: floor)
  const quotas = positive.map((chapter) => ({
    pathId: chapter.pathId,   // Mã chương
    weight: chapter.weight,   // weight (để sắp xếp ưu tiên khi bù)
    // Math.floor = làm tròn xuống — vd 1.06 → 1, 2.12 → 2
    count: Math.floor((chapter.weight / weightTotal) * totalCount),
  }));

  // Tính số section còn THIẾU sau bước làm tròn xuống
  // totalCount - (tổng count đã chia) = phần dư cần bù
  let remaining = totalCount - quotas.reduce((sum, quota) => sum + quota.count, 0);

  // Sắp chương theo weight CAO → THẤP để bù phần thiếu
  // [...quotas] = copy mảng (không đổi mảng gốc khi sort)
  const byWeight = [...quotas].sort(
    // right.weight - left.weight = weight lớn hơn đứng trước
    // || left.pathId - right.pathId = cùng weight thì chương mã nhỏ hơn trước
    (left, right) => right.weight - left.weight || left.pathId - right.pathId,
  );

  // Duyệt từng chương ưu tiên, mỗi vòng cộng thêm 1 section nếu còn thiếu
  for (const quota of byWeight) {
    // Hết phần cần bù → dừng vòng lặp
    if (remaining <= 0) break;

    // Cộng thêm 1 section cho chương này
    quota.count += 1;

    // Giảm số section còn thiếu đi 1
    remaining -= 1;
  }

  // Chuyển kết quả sang Map: mã chương → số section được phân
  const allocation = new Map();

  quotas.forEach((quota) => {
    // Chỉ ghi chương được phân ít nhất 1 section
    if (quota.count > 0) allocation.set(quota.pathId, quota.count);
  });

  return allocation;
}

/**
 * Hàm sanitizeSectionAllocation: loại bỏ chương được phân 0 section.
 * Docx Trường hợp 3: chương weight = 0 không xuất hiện trong đề lần sau.
 */
function sanitizeSectionAllocation(allocation) {
  // Map kết quả sạch (chỉ còn count > 0)
  const result = new Map();

  // Duyệt từng cặp [pathId, count] trong bảng phân bổ gốc
  for (const [pathId, count] of allocation) {
    // Chỉ giữ chương có số section > 0
    if (count > 0) result.set(pathId, count);
  }

  return result;
}

// =============================================================================
// PHẦN 4: NGHE / ĐỌC (docx: lấy nguyên cả section, không cắt từng câu)
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
  // Docx: "Gồm 5 Section (do mentor config)" — đây là tổng section TỐI ĐA được phép
  const totalSections = getSectionCount(mentorConfig, skillType);

  // Mentor chưa đặt section nào cho kỹ năng này → không đề xuất (return null)
  if (totalSections <= 0) return null;

  // DOCX Công thức 1: tính weight từng chương cho kỹ năng đang xét
  const chapters = aggregateChapterWeights(sectionStats, skillType);

  // Không có stat → giữ mentor config
  if (chapters.length === 0) return null;

  // ── DOCX.CASE_1 ── "${DOCX.CASE_1.docxAction}"
  if (isCase1KeepMentorConfig(chapters, mentorConfig, sectionsData, skillType)) return null;

  // ── DOCX.CASE_3 ── lọc chương weight > 0
  const positive = chapters.filter((chapter) => chapter.weight > 0);

  // Mọi chương weight = 0 → DOCX.EXCEPTION.docxBranches[1] → giữ mentor config
  if (positive.length === 0) return null;

  // ── DOCX.CASE_2 ── "${DOCX.CASE_2.docxAction}"
  let allocation = allocateByWeight(positive, totalSections);

  // ── DOCX.BANK_RULE ── đối chiếu question bank
  const bankByChapter = groupSkillBankByChapter(sectionsData, skillType);
  if (bankByChapter.size > 0) {
    allocation = rebalanceSectionAllocation(allocation, bankByChapter, positive);
  }

  // Loại chương được phân 0 section
  allocation = sanitizeSectionAllocation(allocation);

  // Có ít nhất 1 chương được phân section → trả bảng phân bổ; không thì null
  return allocation.size > 0 ? allocation : null;
}

// =============================================================================
// PHẦN 5: TỪ VỰNG / NGỮ PHÁP (docx: 4 bước)
// =============================================================================

/**
 * Hàm groupSkillBankByChapter: nhóm section trong question bank theo chương.
 * Dùng khi đối chiếu với question bank (docx RULE: chương thiếu section trong bank).
 */
function groupSkillBankByChapter(sectionsData = [], skillType) {
  // Map: mã chương → mảng các section thuộc chương đó
  const byChapter = new Map();

  // Duyệt từng section trong question bank
  for (const section of sectionsData) {
    // Bỏ qua nếu: kỹ năng không khớp HOẶC section bị đánh dấu không dùng cho test
    if (section.SkillType !== skillType || !isSectionUseForTest(section)) continue;

    // Lấy mã chương (hỗ trợ cả PathId và pathId)
    const pathId = Number(section.PathId ?? section.pathId);

    // Không có mã chương → bỏ qua
    if (!pathId) continue;

    // Nếu chưa có mảng cho chương này → tạo mảng rỗng
    if (!byChapter.has(pathId)) {
      byChapter.set(pathId, []);
    }

    // Thêm section vào mảng của chương
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

  // Gọi hàm nhóm chung, chỉ lấy kỹ năng VOCABULARY
  const rawByChapter = groupSkillBankByChapter(sectionsData, SKILL_VOCABULARY);

  // Duyệt từng chương trong question bank đã nhóm
  for (const [pathId, pool] of rawByChapter) {
    // pool.map = biến mỗi section thô thành object gọn có đủ thông tin chia câu
    byChapter.set(pathId, pool.map((item) => ({
      pathId, // Mã chương
      sectionId: Number(item.SectionId), // Mã section
      // Ghép mã dạng "chương::section_section" để hệ thống nhận diện sau này
      sectionTempId: buildCourseSectionTempId(pathId, item.SectionId),
      // Số câu thực có trong question bank — không được lấy quá con số này
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
  // Lấy danh sách section + questionCount trong mentor config
  const entries = getVocabularyEntries(mentorConfig);

  // Map: mã chương → { số section mentor config chọn, tổng questionCount mentor config đặt }
  const byChapter = new Map();

  // Duyệt từng section trong mentor config
  for (const entry of entries) {
    // Tách mã section để biết thuộc chương nào
    const parsed = parseCourseSectionTempId(entry.sectionTempId);
    const pathId = parsed.pathId;

    // Không xác định được chương → bỏ qua
    if (!pathId) continue;

    // Tạo ô tổng hợp cho chương nếu chưa có
    if (!byChapter.has(pathId)) {
      byChapter.set(pathId, { pathId, mentorSectionCount: 0, mentorQuestionCount: 0 });
    }

    // Lấy ô tổng hợp của chương
    const bucket = byChapter.get(pathId);

    // Cộng thêm 1 section mentor config đã chọn cho chương này
    bucket.mentorSectionCount += 1;

    // Cộng thêm questionCount mentor config đặt cho section này vào tổng chương
    bucket.mentorQuestionCount += entry.questionCount;
  }

  return {
    // Tổng số section Từ vựng trong mentor config (docx ví dụ: 12 section)
    totalSections: entries.length,
    // Chi tiết theo từng chương
    byChapter,
  };
}

/**
 * Hàm rebalanceSectionAllocation — DOCX.BANK_RULE
 * ${DOCX.BANK_RULE.docxSteps.join('\n * ')}
 */
function rebalanceSectionAllocation(allocation, bankByChapter, chaptersByWeight) {
  // Sao chép bảng phân bổ gốc để sửa mà không đổi bản gốc
  const result = new Map(allocation);

  // deficit = số section còn THIẾU cần bù sang chương khác (do question bank không đủ)
  let deficit = 0;

  // --- Bước 1 docx: cắt nếu phân nhiều hơn số section có trong question bank ---
  for (const [pathId, count] of result) {
    // available = số section thực có trong question bank của chương này
    const available = (bankByChapter.get(pathId) ?? []).length;

    // Nếu phân nhiều hơn số section trong question bank
    if (count > available) {
      // Docx: "Lấy toàn bộ section của chương đó" — chỉ lấy tối đa = available
      result.set(pathId, available);

      // Ghi nhận phần thiếu: count - available section cần bù sang chương khác
      deficit += count - available;
    }
  }

  // Không thiếu section → trả kết quả luôn, không cần bù
  if (deficit <= 0) return result;

  // --- Bước 2 docx: bù theo weight từ cao xuống thấp ---
  const priority = [...chaptersByWeight].sort(
    (left, right) => right.weight - left.weight || left.pathId - right.pathId,
  );

  // Duyệt từng chương theo thứ tự ưu tiên
  for (const chapter of priority) {
    // Đã bù đủ → dừng
    if (deficit <= 0) break;

    const pathId = chapter.pathId;

    // Số section tối đa có thể lấy từ question bank chương này
    const available = (bankByChapter.get(pathId) ?? []).length;

    // Số section đã phân cho chương này (0 nếu chưa có)
    const current = result.get(pathId) ?? 0;

    // canAdd = còn có thể cộng thêm bao nhiêu section (không vượt question bank)
    const canAdd = Math.max(0, available - current);

    // Chương này đã đầy hoặc question bank rỗng → sang chương tiếp
    if (canAdd <= 0) continue;

    // add = số section thực sự bù: lấy nhỏ hơn giữa "còn chỗ" và "còn thiếu"
    const add = Math.min(canAdd, deficit);

    // Cập nhật số section cho chương
    result.set(pathId, current + add);

    // Giảm số section còn thiếu
    deficit -= add;
  }

  // Nếu deficit > 0 sau vòng lặp: docx "dừng bù" — chấp nhận đề ngắn hơn giới hạn mentor config
  return result;
}

/**
 * Hàm pickRandomSections — DOCX: "Lấy random nếu đủ section trong question bank"
 * Xáo trộn danh sách section rồi lấy đủ số lượng cần.
 */
function pickRandomSections(pool, count) {
  // [...pool] = copy mảng gốc (không đổi pool)
  // .sort(() => Math.random() - 0.5) = xáo trộn ngẫu nhiên thứ tự
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  // .slice(0, n) = lấy n phần tử đầu; Math.min = không lấy quá số section có sẵn
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
  // Không có section HOẶC không cần câu nào → trả mảng rỗng
  if (sections.length === 0 || totalQuestions <= 0) return [];

  // Docx "chia đều": số câu cơ bản mỗi section = tổng câu ÷ số section, làm tròn XUỐNG
  const base = Math.floor(totalQuestions / sections.length);

  // Tạo kế hoạch ban đầu cho từng section
  const plan = sections.map((section) => ({
    sectionTempId: section.sectionTempId, // Mã section
    // Số câu gán cho section: base nhưng không vượt số câu có trong question bank
    questionCount: Math.min(base, section.availableCount),
    availableCount: section.availableCount, // Giữ để biết còn chỗ bù thêm không
  }));

  // Tính số câu còn THIẾU sau bước chia đều
  let remaining = totalQuestions - plan.reduce((sum, entry) => sum + entry.questionCount, 0);

  // Sắp section theo số câu trong question bank NHIỀU → ÍT (docx: bù vào section nhiều câu nhất)
  const byAvailability = [...plan].sort(
    (left, right) => right.availableCount - left.availableCount
      // Cùng số câu thì sắp theo mã section (ổn định, tránh nhảy lung tung)
      || left.sectionTempId.localeCompare(right.sectionTempId),
  );

  // Bù từng câu thiếu vào các section còn chỗ
  for (const entry of byAvailability) {
    // Hết câu cần bù → dừng
    if (remaining <= 0) break;

    // Bài này đã lấy hết số câu trong question bank → không bù thêm
    if (entry.questionCount >= entry.availableCount) continue;

    // Cộng thêm 1 câu cho section này
    entry.questionCount += 1;

    // Giảm số câu còn thiếu
    remaining -= 1;
  }

  // Trả danh sách cuối: chỉ section có ít nhất 1 câu; bỏ field availableCount
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
  // Tổng hợp phần Từ vựng trong mentor config theo chương
  const mentorSummary = buildMentorVocabularyChapterSummary(mentorConfig);

  // Destructuring: tách totalSections và byChapter từ mentorSummary
  const { totalSections, byChapter: mentorByChapter } = mentorSummary;

  // Mentor config không chọn section Từ vựng nào → không đề xuất
  if (totalSections <= 0) return null;

  // --- DOCX BƯỚC 1: tính weight từng chương ---
  const chapters = aggregateChapterWeights(sectionStats, SKILL_VOCABULARY);

  // Không có stat → giữ mentor config
  if (chapters.length === 0) return null;

  // ── DOCX.VOCABULARY.steps.step1 + CASE_1 ──
  if (isCase1KeepMentorConfig(chapters, mentorConfig, sectionsData, SKILL_VOCABULARY)) {
    return null;
  }

  // ── DOCX.CASE_3 ──
  const positive = chapters.filter((chapter) => chapter.weight > 0);

  if (positive.length === 0) return null;

  const bankByChapter = groupVocabularyBankByChapter(sectionsData);

  // ── DOCX.VOCABULARY.steps.step3 + CASE_2 + BANK_RULE ──
  let sectionAllocation = allocateByWeight(positive, totalSections);

  // Đối chiếu question bank: bù nếu chương thiếu section
  sectionAllocation = rebalanceSectionAllocation(sectionAllocation, bankByChapter, positive);

  // Loại chương phân 0 section
  sectionAllocation = sanitizeSectionAllocation(sectionAllocation);

  // Không còn chương nào → null
  if (sectionAllocation.size === 0) return null;

  // Mảng kế hoạch cuối: mỗi phần tử = một section + số câu cần lấy
  const vocabularyPlan = [];

  // ── DOCX.VOCABULARY.steps.step4 ── random section + chia câu từng chương
  for (const [pathId, sectionCount] of sectionAllocation) {
    // An toàn: bỏ qua nếu sectionCount không dương
    if (sectionCount <= 0) continue;

    // Lấy tổng hợp mentor config cho chương này
    const mentorChapter = mentorByChapter.get(pathId);

    // questionCount mentor config đặt cho chương (docx: Ch1=13, Ch2=17, Ch3=19)
    // ?. = an toàn nếu không có; ?? 0 = mặc định 0
    const mentorQuestionCount = mentorChapter?.mentorQuestionCount ?? 0;

    // Danh sách section Từ vựng trong question bank của chương này
    const pool = bankByChapter.get(pathId) ?? [];

    // Docx: chọn ngẫu nhiên đủ sectionCount section từ pool
    const picked = pickRandomSections(pool, sectionCount);

    // Chia mentorQuestionCount câu vào các section đã chọn
    const questionPlan = distributeQuestionsAcrossSections(picked, mentorQuestionCount);

    // Gộp kết quả chương này vào kế hoạch tổng
    // ...questionPlan = spread — thêm từng phần tử, không lồng mảng
    vocabularyPlan.push(...questionPlan);
  }

  // Có ít nhất 1 section trong kế hoạch → trả kế hoạch; không thì null
  return vocabularyPlan.length > 0 ? vocabularyPlan : null;
}

// =============================================================================
// PHẦN 6: GOM TẤT CẢ — TẠO CẤU HÌNH ĐỀ MỚI
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
  // Không có thống kê (không phải mảng / rỗng) HOẶC không có config → giữ nguyên config gốc
  if (!Array.isArray(sectionStats) || sectionStats.length === 0 || !mentorConfig) {
    return mentorConfig;
  }

  // JSON.parse(JSON.stringify(...)) = sao chép sâu config để sửa không ảnh hưởng bản gốc
  const nextConfig = JSON.parse(JSON.stringify(mentorConfig));

  // Object lưu phân bổ section Nghe/Đọc theo chương (key = kỹ năng, value = Map)
  const chapterSectionCounts = {};

  // Cờ: có ít nhất một đề xuất thay đổi so với config gốc không
  let hasRecommendation = false;

  // --- Docx Nghe/Đọc: cùng quy tắc, tính RIÊNG từng kỹ năng ---
  for (const skillType of [SKILL_LISTENING, SKILL_READING]) {
    // Gọi hàm đề xuất phân bổ section cho kỹ năng hiện tại
    const allocation = recommendListeningReadingAllocation(
      sectionStats,
      mentorConfig,
      skillType,
      sectionsData,
    );

    // allocation là Map có dữ liệu → ghi nhận đề xuất
    if (allocation && allocation.size > 0) {
      chapterSectionCounts[skillType] = allocation;
      hasRecommendation = true;
    }
  }

  // --- Docx Từ vựng: 4 bước ---
  const vocabularyPlan = recommendVocabularyPlan(sectionStats, mentorConfig, sectionsData);

  if (vocabularyPlan) {
    // Gắn kế hoạch Từ vựng vào config mới
    nextConfig.vocabularyPlan = vocabularyPlan;
    hasRecommendation = true;
  }

  // Nếu có phân bổ Nghe/Đọc → gắn vào config mới
  if (Object.keys(chapterSectionCounts).length > 0) {
    nextConfig.chapterSectionCounts = chapterSectionCounts;
  }

  // Có đề xuất → trả config mới; không → trả mentor config gốc (Trường hợp 1)
  return hasRecommendation ? nextConfig : mentorConfig;
}

// =============================================================================
// PHẦN 7: HÀM GỌI TỪ BÊN NGOÀI (luồng làm bài của học viên)
// =============================================================================

/**
 * Hàm resolveCourseTestPaperConfig — kiểm tra trước khi tạo đề:
 *   - Lần đầu (chưa có attempt nào) → dùng mentor config, KHÔNG chạy thuật toán docx
 *   - Lần 2 trở đi (đã có attempt trước, mọi status) → chạy thuật toán docx
 */
async function resolveCourseTestPaperConfig({ userId, courseId, testId }) {
  // Lấy mentor config gốc
  const mentorResult = await getMentorCourseTestConfig(courseId);

  // Lấy config thất bại → trả lỗi
  if (!mentorResult.ok) {
    return { ok: false, message: mentorResult.message };
  }

  // Config hợp lệ
  const mentorConfig = mentorResult.config;

  // Xác định mã bài kiểm tra: ưu tiên testId truyền vào, không có thì lấy từ config
  const resolvedTestId = Number(testId) || Number(mentorConfig.id);

  // Vẫn không có mã bài kiểm tra → báo lỗi
  if (!resolvedTestId) {
    return { ok: false, message: 'Giảng viên chưa tạo bài kiểm tra toàn khóa!' };
  }

  // Đếm số lần làm (submitted + in_progress), không lọc status
  const attemptCount = await studentTestModel.getAttemptCountByUserAndTest(
    userId,
    resolvedTestId,
  );

  return {
    ok: true,
    config: mentorConfig,
    testId: resolvedTestId,
    // attemptCount > 0 = đã có ít nhất 1 lần làm trước → lần start tiếp theo chạy thuật toán docx
    hasSubmittedBefore: attemptCount > 0,
  };
}

/**
 * Hàm buildRecommendedCourseTestPaper — tạo đề có điều chỉnh theo docx
 * (chỉ khi học viên đã có thống kê từ lần làm trước):
 *   1. Lấy kết quả lần gần nhất
 *   2. Tải question bank
 *   3. Chạy thuật toán docx (recommendCourseTestFromStats)
 *   4. Tạo đề thực tế (studentTestPaperService — chọn câu ngẫu nhiên vào đề)
 */
async function buildRecommendedCourseTestPaper({ userId, courseId, mentorConfig, testId }) {
  // Nạp dịch vụ tạo đề (require trong hàm để tránh vòng lặp import)
  const studentTestPaperService = require('./studentTestPaperService');

  // Bước 1: lấy thống kê lần làm gần nhất
  const { sectionStats } = await getLatestCourseTestAttemptStats({
    userId,
    courseId,
    testId,
  });

  // Bước 2: tải toàn bộ section trong question bank của khóa (theo mentor config)
  const sectionsData = await studentTestPaperService.loadCourseTestSections(courseId, mentorConfig);

  // Bước 3: nếu có thống kê → chạy thuật toán; không → dùng mentor config nguyên bản
  const paperConfig = sectionStats.length > 0
    ? recommendCourseTestFromStats(sectionStats, mentorConfig, sectionsData)
    : mentorConfig;

  // Bước 4: từ config (gốc hoặc đã đề xuất) + question bank → tạo đề hoàn chỉnh
  return studentTestPaperService.buildCourseTestPaperWithSections(paperConfig, sectionsData);
}

// module.exports = khai báo các hàm cho tệp khác gọi được
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
