/**
 * =============================================================================
 * Nội dung trích từ tài liệu gốc:
 *   Thuật toán đề xuất câu hỏi.docx
 *
 * Mục đích: giữ nguyên lời docx trong code để mỗi nhánh thuật toán
 * (Case 1 / 2 / 3 / Exception / RULE) có thể tra cứu trực tiếp.
 *
 * Ánh xạ → testRecommendationService.js:
 *   FORMULA_1              → aggregateChapterWeights
 *   FORMULA_2              → allocateByWeight
 *   CASE_1                 → isCase1KeepMentorConfig → return null (giữ mentor config)
 *   CASE_2                 → allocateByWeight (≥ 2 chương weight > 0, weight khác nhau)
 *   CASE_3                 → lọc positive (weight > 0)
 *   EXCEPTION              → allocateByWeight khi positive.length === 1
 *   BANK_RULE              → rebalanceSectionAllocation
 *   LISTENING_READING      → recommendListeningReadingAllocation
 *   VOCABULARY             → recommendVocabularyPlan (bước 1–4)
 *   VOCABULARY_STEP_4      → distributeQuestionsAcrossSections + pickRandomSections
 * =============================================================================
 */

const SOURCE_FILE = 'Thuật toán đề xuất câu hỏi.docx';

/** Nghe / Đọc — phần mở đầu docx */
const LISTENING_READING = {
  /** Docx: "Nghe/Đọc: chương sai nhiều được phân bổ nhiều section/bài nghe/bài đọc hơn" */
  summary:
    'Chương làm sai nhiều → lần làm sau được nhiều section Nghe/Đọc hơn. '
    + 'Một section được lấy nguyên bài — không cần xác định mỗi section lấy bao nhiêu câu.',

  /** Docx: khối RULE Nghe/Đọc */
  rules: [
    'Tổng section sau đề xuất <= tổng section do mentor config.',
    'Chương thiếu section trong question bank → lấy hết section chương đó.',
    'Bù phần thiếu sang chương khác theo weight cao → thấp.',
    'Random nếu đủ section trong question bank.',
    'Hết question bank → dừng bù, tổng <= mentor config.',
    'Chương có weight = 0 → không xuất hiện (xem Trường hợp 3).',
  ],
};

/** Docx: Công thức 1 */
const FORMULA_1 = {
  title: 'Công thức 1 — Tỷ lệ sai của chương',
  formula: 'Tỷ lệ sai của chương = tổng câu sai / tổng câu hỏi trong chương',
  codeField: 'weight',
  examples: {
    listening: [
      { chapter: 1, wrong: 7, total: 20, weight: 0.35 },
      { chapter: 2, wrong: 7, total: 10, weight: 0.7 },
      { chapter: 3, wrong: 12, total: 20, weight: 0.6 },
    ],
    vocabulary: [
      { chapter: 1, wrong: 7, total: 13, weight: 0.54 },
      { chapter: 2, wrong: 8, total: 17, weight: 0.47 },
      { chapter: 3, wrong: 10, total: 19, weight: 0.53 },
    ],
  },
};

/** Docx: Công thức 2 */
const FORMULA_2 = {
  title: 'Công thức 2 — Số section mỗi chương lần làm tiếp theo',
  formula:
    'Lượng section của chương = (Tỷ lệ sai chương / Tổng tỷ lệ sai) × Tổng section mentor config',
  rounding: 'Làm tròn xuống (floor). Phần section còn thiếu bù vào chương có weight lớn nhất.',
  codeFunction: 'allocateByWeight',
  exampleListening: {
    mentorSections: 5,
    weights: { 1: 0.35, 2: 0.7, 3: 0.6 },
    weightTotal: 1.65,
    floorSteps: [
      { chapter: 1, calc: '0.35/1.65×5', floor: 1 },
      { chapter: 2, calc: '0.7/1.65×5', floor: 2 },
      { chapter: 3, calc: '0.6/1.65×5', floor: 1 },
    ],
    sumAfterFloor: 4,
    remainder: 1,
    remainderTo: 'Chương 2 (weight lớn nhất)',
    result: { 1: 1, 2: 3, 3: 1 },
  },
};

/** Docx: Trường hợp 1 */
const CASE_1 = {
  id: 'CASE_1',
  title: 'Trường hợp 1 — Tất cả các chương có tỷ lệ sai = nhau',
  docxCondition: 'Tất cả các chương có tỷ lệ sai = nhau.',
  docxAction: 'Giữ nguyên config ban đầu của Mentor.',
  codeCondition:
    'weight bằng nhau VÀ mọi chương eligible (mentor chọn + có section trong bank cho skill) '
    + 'đều xuất hiện trong stat lần làm gần nhất.',
  codeAction: 'return null → recommendCourseTestFromStats trả mentor config gốc.',
  codeFunction: 'isCase1KeepMentorConfig',
  /** Docx không nói rõ "eligible"; code bổ sung để khớp UI (không chọn chương không có bank). */
  codeNote:
    'Code thêm điều kiện "đủ chương eligible" vì mentor chỉ chọn chương có question bank.',
};

/** Docx: Trường hợp 2 */
const CASE_2 = {
  id: 'CASE_2',
  title: 'Trường hợp 2 — Các chương có tỷ lệ sai khác nhau',
  docxCondition: 'Các chương có tỷ lệ sai khác nhau.',
  docxAction: 'Áp dụng Công thức 2 (floor + bù dư vào chương weight cao nhất).',
  docxExample: FORMULA_2.exampleListening,
  codeCondition: '≥ 2 chương có weight > 0 và không thỏa Case 1.',
  codeAction: 'allocateByWeight(positive, totalSections) → chapterSectionCounts.',
  codeFunction: 'allocateByWeight',
};

/** Docx: Trường hợp 3 */
const CASE_3 = {
  id: 'CASE_3',
  title: 'Trường hợp 3 — Có chương có weight = 0',
  docxCondition: 'Có 1 chương bất kỳ có weight = 0 (làm đúng hết, không sai câu nào).',
  docxAction: 'Lần làm lại test tiếp theo sẽ không xuất hiện chương đó.',
  vocabularyExample: {
    mentorConfig: { 1: 13, 2: 17, 3: 19, total: 49 },
    afterRecommend: { 1: 13, 2: 17, total: 30, note: 'C3 biến mất vì weight = 0' },
  },
  codeCondition: 'positive = chapters.filter(weight > 0) — chỉ phân bổ cho chương còn sai.',
  codeFunction: 'allocateByWeight (bước lọc positive đầu hàm)',
};

/** Docx: Trường hợp Exception */
const EXCEPTION = {
  id: 'EXCEPTION',
  title: 'Trường hợp Exception — Chỉ còn 1 chương có weight > 0',
  docxCondition:
    'Sau nhiều vòng làm, các chương weight = 0 biến mất, chỉ còn section của 1 chương.',
  docxBranches: [
    {
      when: 'Chương đó weight > 0',
      then: 'Test chỉ chứa chương đó (giao hết section mentor config cho chương đó).',
    },
    {
      when: 'Chương đó weight = 0',
      then: 'Trở lại Trường hợp 1 — lấy config ban đầu của Mentor.',
    },
  ],
  codeCondition: 'positive.length === 1 sau khi lọc Case 3.',
  codeAction: 'Map([[pathId, totalCount]]) — toàn bộ section Nghe/Đọc cho 1 chương.',
  codeFunction: 'allocateByWeight',
};

/** Docx: RULE đối chiếu question bank (dùng chung Nghe/Đọc/Từ vựng bước 3) */
const BANK_RULE = {
  title: 'RULE question bank — Chương thiếu section trong bank',
  docxSteps: [
    'Nếu lượng section hiện tại của chương > lượng section trong question bank '
    + '→ lấy toàn bộ section của chương đó.',
    'Phần section còn thiếu bù vào chương khác theo weight từ cao xuống thấp.',
    'Nếu đã bù hết mà bank vẫn không đủ → dừng bù, chấp nhận tổng hiện tại (vẫn <= mentor config).',
  ],
  codeFunction: 'rebalanceSectionAllocation',
};

/** Docx: Từ vựng / Ngữ pháp */
const VOCABULARY = {
  title: 'Từ vựng / Ngữ pháp',
  rules: [
    'Số câu sau đề xuất <= số câu mentor config.',
    'Số section sau đề xuất <= số section mentor config.',
    'Chương thiếu section trong bank → lấy hết section chương đó, bù sang chương khác theo weight.',
    'Random nếu đủ section trong question bank.',
    'Chương weight = 0 → không xuất hiện lần làm lại.',
    'Hết bank → dừng bù; tổng section/câu vẫn <= mentor config.',
    'Số câu mỗi section không vượt tổng câu section đó trong question bank.',
  ],
  steps: {
    step1: {
      title: 'Bước 1 — Tính weight (Công thức 1)',
      example: FORMULA_1.examples.vocabulary,
    },
    step2: {
      title: 'Bước 2 — Xếp ưu tiên weight cao → thấp',
      example: 'Ch1 (0.54) → Ch3 (0.53) → Ch2 (0.47)',
    },
    step3: {
      title: 'Bước 3 — Chia section (Công thức 2 + BANK_RULE)',
      mentorSections: 12,
      weights: { 1: 0.54, 2: 0.47, 3: 0.53 },
      weightTotal: 1.54,
      floorResult: { 1: 4, 2: 3, 3: 4 },
      sumAfterFloor: 11,
      remainder: 1,
      remainderTo: 'Ch1 (weight cao nhất)',
      result: { 1: 5, 2: 3, 3: 4 },
    },
    step4: {
      title: 'Bước 4 — Random section + chia câu đều',
      mentorQuestions: { 1: 13, 2: 17, 3: 19 },
      sectionsAfterStep3: { 1: 5, 2: 3, 3: 4 },
      distribution: [
        {
          chapter: 1,
          sections: 5,
          perSectionFloor: 2,
          remainder: 3,
          remainderRule: 'Bù vào section có nhiều câu nhất trong question bank',
        },
        {
          chapter: 2,
          sections: 3,
          perSectionFloor: 5,
          remainder: 2,
          remainderRule: 'Bù vào section có nhiều câu nhất trong question bank',
        },
        {
          chapter: 3,
          sections: 4,
          perSectionFloor: 4,
          remainder: 3,
          remainderRule: 'Bù vào section có nhiều câu nhất trong question bank',
        },
      ],
    },
  },
};

/** Tra cứu nhanh theo mã case — dùng trong comment / log */
const CASE_BY_ID = {
  CASE_1,
  CASE_2,
  CASE_3,
  EXCEPTION,
};

/**
 * Trả về mô tả ngắn một case docx (tiếng Việt, cho người non-IT).
 * @param {'CASE_1'|'CASE_2'|'CASE_3'|'EXCEPTION'} caseId
 */
function explainCase(caseId) {
  const item = CASE_BY_ID[caseId];
  if (!item) return '';
  return [
    `[${item.id}] ${item.title}`,
    `Docx: ${item.docxCondition}`,
    `Hành động: ${item.docxAction || item.docxBranches?.map((b) => `${b.when} → ${b.then}`).join(' | ')}`,
  ].join('\n');
}

module.exports = {
  SOURCE_FILE,
  LISTENING_READING,
  FORMULA_1,
  FORMULA_2,
  CASE_1,
  CASE_2,
  CASE_3,
  EXCEPTION,
  BANK_RULE,
  VOCABULARY,
  CASE_BY_ID,
  explainCase,
};
