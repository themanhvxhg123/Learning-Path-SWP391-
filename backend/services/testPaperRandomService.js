/**
 * =============================================================================
 * FILE    : testPaperRandomService.js
 * MỤC ĐÍCH: Random (chọn ngẫu nhiên) đề thi theo config mentor hoặc config đã đề xuất
 * TÀI LIỆU: Thuật toán đề xuất câu hỏi.docx
 * =============================================================================
 *
 * VAI TRÒ TRONG HỆ THỐNG
 * -----------------------
 * File này KHÔNG tính weight / phân bổ theo chương.
 * Nhiệm vụ: nhận config (gốc hoặc đã qua testRecommendationService) + question bank,
 * rồi chọn section/câu hỏi cụ thể để tạo đề làm bài.
 *
 * Luồng bài kiểm tra toàn khóa (final):
 *   Lần đầu làm bài  → config mentor gốc → random theo mentor
 *   Lần làm lại      → config đã đề xuất  → random theo phân bổ đề xuất
 *
 * PHÂN CÔNG THEO KỸ NĂNG (docx)
 * ------------------------------
 * | Kỹ năng    | Random gì?                                      | Nguồn config        |
 * |------------|-------------------------------------------------|---------------------|
 * | Nghe/Đọc   | Random SECTION (lấy nguyên cả bài nghe/đọc)     | sectionCount mentor |
 * |            | Có đề xuất: theo chapterSectionCounts          | hoặc Map đề xuất    |
 * | Từ vựng    | Section cố định (từ plan), random CÂU trong đó  | vocabularyPlan      |
 *
 * RULE DOCX — NGHE / ĐỌC (khi đã đề xuất)
 * ----------------------------------------
 * - Chỉ lấy section từ các chương có trong phân bổ đề xuất (chapterSectionCounts)
 * - Chương weight = 0 KHÔNG có trong Map → KHÔNG backfill từ chương đó
 * - Mỗi chương: random tối đa min(số section phân bổ, số section trong bank)
 * - Tổng section thực tế có thể < mentor nếu bank thiếu (docx: tổng <= mentor)
 * - Không ép đủ pickCount mentor khi đang dùng đề xuất
 *
 * RULE DOCX — NGHE / ĐỌC (lần đầu, chưa đề xuất)
 * ------------------------------------------------
 * - Random section theo sectionCount mentor (pickCount)
 * - pickCount < số chương: chọn pickCount chương khác nhau, mỗi chương 1 section
 * - pickCount >= số chương: chia đều floor(pickCount/chương) section/chương;
 *   phần dư random thêm từng chương còn section (chương hết section → loại, thử chương khác)
 * - Mentor đã validate khi lưu config: sectionCount <= tổng section kỹ năng trong bank
 * - Không lấy trùng cùng một section trong một chương
 * - Validate: phải đủ đúng số section mentor config
 *
 * RULE DOCX — TỪ VỰNG
 * --------------------
 * - Nếu có vocabularyPlan (đã đề xuất): lấy đúng section + số câu trong plan
 * - Nếu không: lấy theo sectionQuestionCounts mentor gốc
 * - Mỗi section random đúng questionCount câu (shuffle trong bank section đó)
 *
 * VALIDATE SAU KHI RANDOM
 * -----------------------
 * - Lần đầu (không đề xuất): Nghe/Đọc phải đủ section mentor
 * - Có đề xuất: Nghe/Đọc chỉ cần <= mentor, không báo lỗi khi thiếu do bank
 * - Từ vựng: kiểm tra từng entry trong plan có đủ câu không
 * =============================================================================
 */

// =============================================================================
// PHẦN 1: HẰNG SỐ KỸ NĂNG — khớp SkillType DB và part trong questionConfigs
// =============================================================================

/** Chuỗi định danh kỹ năng Nghe */
const SKILL_LISTENING = 'LISTENING';

/** Chuỗi định danh kỹ năng Đọc — dùng chung logic random với Nghe */
const SKILL_READING = 'READING';

/** Chuỗi định danh kỹ năng Từ vựng / Ngữ pháp */
const SKILL_VOCABULARY = 'VOCABULARY';

// =============================================================================
// PHẦN 2: HELPER ĐỌC CONFIG VÀ LỌC SECTION
// =============================================================================

/**
 * Kiểm tra section có được phép đưa vào bài kiểm tra không.
 * Mentor tắt IsUseForTest → section không vào pool random.
 */
function isSectionUseForTest(section) {
  // Chỉ coi là "không dùng" khi IsUseForTest rõ ràng = false hoặc = 0
  // null/undefined/1 → vẫn được random
  return section?.IsUseForTest !== false && section?.IsUseForTest !== 0;
}

/**
 * Xáo trộn mảng bằng Fisher-Yates — random công bằng, không sửa mảng gốc.
 */
function shuffleArray(items = []) {
  // Sao chép mảng để không mutate items gốc
  const next = [...items];
  // Duyệt từ phần tử cuối về đầu
  for (let i = next.length - 1; i > 0; i -= 1) {
    // Chọn index ngẫu nhiên j trong [0, i]
    const j = Math.floor(Math.random() * (i + 1));
    // Hoán đổi next[i] và next[j]
    [next[i], next[j]] = [next[j], next[i]];
  }
  // Trả bản sao đã shuffle
  return next;
}

/** Tìm object config của một kỹ năng (part) trong mảng questionConfigs */
function getPartConfig(config, part) {
  // config?.questionConfigs = lấy mảng an toàn; find theo part; ?? {} nếu không có
  return (config?.questionConfigs ?? []).find((entry) => entry.part === part) ?? {};
}

/**
 * Số section mentor cấu hình cho Nghe hoặc Đọc.
 * Docx: đây là TRẦN TRÊN — tổng section sau đề xuất <= giá trị này.
 */
function getSectionCountForPart(config, part) {
  // Ép số, NaN → 0, không cho âm
  return Math.max(0, Number(getPartConfig(config, part).sectionCount ?? 0) || 0);
}

/**
 * Danh sách section Từ vựng + số câu từ config mentor gốc.
 * Dùng khi chưa có vocabularyPlan (lần 1 hoặc Case 1).
 */
function getSectionQuestionCountsForPart(config, part) {
  return (getPartConfig(config, part).sectionQuestionCounts ?? [])
    .map((entry) => ({
      // Chuẩn hóa sectionTempId thành string
      sectionTempId: String(entry.sectionTempId ?? ''),
      // Số câu tối thiểu 0
      questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
    }))
    // Bỏ entry không có sectionTempId
    .filter((entry) => entry.sectionTempId);
}

// =============================================================================
// PHẦN 3: PARSE sectionTempId — định dạng "pathId::section_{id}" hoặc "section_{id}"
// =============================================================================

/** Trích sectionId từ chuỗi đơn giản "section_123" */
function parseSectionIdFromTempId(sectionTempId) {
  // Regex: bắt đầu "section_" + số
  const match = String(sectionTempId ?? '').match(/^section_(\d+)$/);
  // Có match → trả số; không → null
  return match ? Number(match[1]) : null;
}

/**
 * Phân tích sectionTempId thành pathId (chương) và sectionId.
 * Test toàn khóa: "12::section_34" → chương 12, section 34
 */
function parseCourseSectionTempId(sectionTempId) {
  // Ép sang string an toàn
  const raw = String(sectionTempId ?? '');
  // Thử khớp định dạng ghép chương + section
  const composite = raw.match(/^(\d+)::section_(\d+)$/);
  if (composite) {
    return {
      pathId: Number(composite[1]), // Nhóm 1 = mã chương
      sectionId: Number(composite[2]), // Nhóm 2 = mã section
    };
  }
  // Không khớp ghép → chỉ parse sectionId đơn (test chương)
  return {
    pathId: null,
    sectionId: parseSectionIdFromTempId(raw),
  };
}

// =============================================================================
// PHẦN 4: BUILD CÂU HỎI TỪ DB — gom choice theo QuestionId
// =============================================================================

/**
 * Chuyển các dòng thô từ DB (1 câu × nhiều dòng choice) thành object câu hỏi cho đề.
 */
function buildQuestionsFromRows(rawQuestions = []) {
  // Map: QuestionId → object câu hỏi đang gom
  const questionsMap = new Map();

  for (const row of rawQuestions) {
    // Bỏ câu mentor đánh dấu không dùng cho test
    if (row.IsUseForTest === false || row.IsUseForTest === 0) continue;

    // Lần đầu gặp QuestionId → khởi tạo skeleton câu hỏi
    if (!questionsMap.has(row.QuestionId)) {
      questionsMap.set(row.QuestionId, {
        tempId: row.QuestionId.toString(), // ID câu cho frontend
        questionText: row.Title, // Nội dung câu
        skillType: row.SkillType, // Nghe/Đọc/TV
        options: [], // Danh sách đáp án
        correctCount: 0, // Đếm số đáp án đúng (nội bộ)
      });
    }

    // Dòng có ChoiceId = một lựa chọn của câu
    if (row.ChoiceId) {
      const question = questionsMap.get(row.QuestionId);
      question.options.push({
        tempId: row.ChoiceId.toString(),
        optionText: row.ChoiceTitle,
      });
      // IsTrue = đáp án đúng → tăng correctCount
      if (row.IsTrue) question.correctCount += 1;
    }
  }

  // Map → mảng; thêm cờ isMultipleChoice; xóa correctCount khỏi output
  return Array.from(questionsMap.values()).map((question) => {
    const next = {
      ...question,
      // Nhiều hơn 1 đáp án đúng → câu chọn nhiều
      isMultipleChoice: question.correctCount > 1,
    };
    delete next.correctCount; // Không gửi ra frontend
    return next;
  });
}

// =============================================================================
// PHẦN 5: NHÓM SECTION THEO CHƯƠNG — phục vụ random lần đầu (chia đều)
// =============================================================================

/** Lấy pathId (ID chương) từ object section — hỗ trợ PathId hoặc pathId */
function getSectionPathId(section) {
  const pathId = Number(section.PathId ?? section.pathId);
  // Chỉ trả số hợp lệ; NaN/Infinity → null
  return Number.isFinite(pathId) ? pathId : null;
}

/**
 * Liệt kê các chương có section ứng viên, kèm PathOrder để sort đúng thứ tự hiển thị.
 */
function getChaptersFromCandidates(candidates = []) {
  const chapterMap = new Map();

  for (const section of candidates) {
    const pathId = getSectionPathId(section);
    if (pathId == null) continue; // Không xác định chương → bỏ

    if (!chapterMap.has(pathId)) {
      const pathOrder = Number(section.PathOrder ?? section.pathOrder);
      chapterMap.set(pathId, {
        pathId,
        // PathOrder hợp lệ > 0 thì dùng; không thì fallback pathId
        pathOrder: Number.isFinite(pathOrder) && pathOrder > 0 ? pathOrder : pathId,
      });
    }
  }

  // Chuyển Map → mảng, sort theo thứ tự chương
  return Array.from(chapterMap.values())
    .sort((left, right) => left.pathOrder - right.pathOrder || left.pathId - right.pathId);
}

/** Nhóm section ứng viên theo pathId → Map<pathId, section[]> */
function groupCandidatesByChapter(candidates = []) {
  const byChapter = new Map();

  for (const section of candidates) {
    const pathId = getSectionPathId(section);
    if (pathId == null) continue;
    if (!byChapter.has(pathId)) byChapter.set(pathId, []);
    byChapter.get(pathId).push(section);
  }

  return byChapter;
}

/**
 * Random tối đa `count` section chưa dùng từ MỘT chương.
 * pickedSectionIds = Set các SectionId đã chọn — tránh trùng trong cùng đề.
 */
function pickUnusedSectionsFromChapter(byChapter, pathId, count, pickedSectionIds) {
  if (count <= 0) return [];

  // Pool = section chương pathId, loại section đã nằm trong pickedSectionIds
  const pool = (byChapter.get(pathId) ?? []).filter(
    (section) => !pickedSectionIds.has(section.SectionId),
  );
  // Shuffle pool, lấy tối đa min(count, pool.length) section
  const taken = shuffleArray(pool).slice(0, Math.min(count, pool.length));

  // Ghi nhận SectionId đã chọn vào Set
  for (const section of taken) {
    pickedSectionIds.add(section.SectionId);
  }

  return taken;
}

/** Lọc danh sách chương còn ít nhất 1 section chưa được chọn */
function getChaptersWithAvailableSections(chapters, byChapter, pickedSectionIds) {
  return chapters.filter((chapter) =>
    (byChapter.get(chapter.pathId) ?? []).some(
      (section) => !pickedSectionIds.has(section.SectionId),
    ));
}

/**
 * Chọn section Nghe/Đọc theo quy tắc CHIA ĐỀU CHƯƠNG — dùng lần đầu / Case 1.
 *
 * pickCount < số chương → random pickCount chương, mỗi chương 1 section.
 * pickCount >= số chương → floor(pickCount/chương) mỗi chương, bù phần dư random.
 */
function pickSectionsDistributedAcrossChapters(candidates, pickCount) {
  if (pickCount <= 0) return [];

  const byChapter = groupCandidatesByChapter(candidates);
  const chapters = getChaptersFromCandidates(candidates);

  // Không xác định được chương → shuffle toàn pool, cắt pickCount
  if (chapters.length === 0) {
    return shuffleArray(candidates).slice(0, pickCount);
  }

  const picked = []; // Section thô đã chọn (chưa load câu)
  const pickedSectionIds = new Set(); // Tránh trùng SectionId

  if (pickCount < chapters.length) {
    // --- Nhánh A: ít section hơn số chương ---
    const selectedChapters = shuffleArray(chapters).slice(0, pickCount);
    for (const chapter of selectedChapters) {
      picked.push(
        ...pickUnusedSectionsFromChapter(byChapter, chapter.pathId, 1, pickedSectionIds),
      );
    }
  } else {
    // --- Nhánh B: nhiều section hơn hoặc bằng số chương ---
    const basePerChapter = Math.floor(pickCount / chapters.length);

    // Mỗi chương lấy basePerChapter section
    for (const chapter of chapters) {
      picked.push(
        ...pickUnusedSectionsFromChapter(byChapter, chapter.pathId, basePerChapter, pickedSectionIds),
      );
    }

    // Bù phần còn thiếu: dư pickCount % chapters HOẶC chương không đủ quota
    while (picked.length < pickCount) {
      const eligible = getChaptersWithAvailableSections(chapters, byChapter, pickedSectionIds);
      if (eligible.length === 0) break; // Hết section → dừng

      const chapter = eligible[Math.floor(Math.random() * eligible.length)];
      const taken = pickUnusedSectionsFromChapter(byChapter, chapter.pathId, 1, pickedSectionIds);
      if (taken.length === 0) break;

      picked.push(...taken);
    }
  }

  // Xáo thứ tự section trong đề, đảm bảo không vượt pickCount
  return shuffleArray(picked).slice(0, pickCount);
}

// =============================================================================
// PHẦN 6: BUILD MỘT SECTION TRONG ĐỀ — load câu + metadata
// =============================================================================

/**
 * Tạo một entry section hoàn chỉnh trong đề thi (kèm câu hỏi đã shuffle).
 *
 * limitCount = null → Nghe/Đọc: lấy TOÀN BỘ câu trong section (docx: nguyên bài).
 * limitCount = số  → Từ vựng: slice đúng questionCount câu.
 */
async function buildSectionPaperEntry(section, limitCount, pathId, loadQuestionsForSection) {
  // Gọi callback inject từ studentTestPaperService → query DB theo sectionId
  const rawQuestions = await loadQuestionsForSection(section.SectionId);
  // Gom row DB → object câu; lọc IsUseForTest
  let questions = buildQuestionsFromRows(rawQuestions);
  // Random thứ tự câu trong section
  questions = shuffleArray(questions);

  if (limitCount != null) {
    // Từ vựng: chỉ lấy đúng số câu trong plan
    questions = questions.slice(0, limitCount);
  }
  // Nghe/Đọc: limitCount null → giữ nguyên toàn bộ questions

  if (questions.length === 0) {
    // Section không có câu usable → bỏ section này
    return null;
  }

  return {
    sectionId: section.SectionId.toString(),
    pathId: Number(pathId ?? section.PathId ?? section.pathId ?? 0) || null,
    pathName: section.PathName ?? section.pathName ?? null,
    pathOrder: (() => {
      const parsed = Number(section.PathOrder ?? section.pathOrder);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    })(),
    title: section.Title || section.SectionName,
    skillType: section.SkillType,
    // Chỉ Nghe mới gắn audioUrl
    audioUrl: section.SkillType === SKILL_LISTENING ? (section.SourceUrl || null) : null,
    // Chỉ Đọc mới gắn readingUrl
    readingUrl: section.SkillType === SKILL_READING ? (section.SourceUrl || null) : null,
    questions,
  };
}

// =============================================================================
// PHẦN 7: RANDOM NGHE / ĐỌC — hai chế độ: mentor gốc vs đề xuất
// =============================================================================

/**
 * Chọn section Nghe hoặc Đọc cho đề thi.
 *
 * Chế độ A (usesRecommendation): theo Map pathId → số section từ testRecommendationService.
 * Chế độ B (không Map): pickSectionsDistributedAcrossChapters — lần đầu / Case 1.
 */
async function pickListeningReadingSections(
  sectionsData,
  skill,
  pickCount,
  chapterSectionCounts,
  loadQuestionsForSection,
) {
  if (pickCount <= 0) return [];

  // Lọc section đúng kỹ năng + IsUseForTest
  const candidates = sectionsData.filter(
    (section) => section.SkillType === skill && isSectionUseForTest(section),
  );

  // chapterSectionCounts phải là Map thì mới coi là phân bổ đề xuất
  const allocationMap = chapterSectionCounts instanceof Map ? chapterSectionCounts : null;
  const usesRecommendation = allocationMap && allocationMap.size > 0;
  let orderedCandidates;

  if (usesRecommendation) {
    // --- Chế độ đề xuất (docx Case 2/3 + BANK_RULE) ---
    const byChapter = new Map();
    for (const section of candidates) {
      const pathId = getSectionPathId(section);
      if (pathId == null) continue;
      if (!byChapter.has(pathId)) byChapter.set(pathId, []);
      byChapter.get(pathId).push(section);
    }

    orderedCandidates = [];
    // Duyệt từng cặp [pathId, số section cần lấy] trong Map phân bổ
    for (const [pathId, count] of allocationMap) {
      const pool = byChapter.get(pathId) ?? [];
      // Random pool, lấy min(count, pool.length) — thiếu bank thì lấy hết chương đó
      orderedCandidates.push(
        ...shuffleArray(pool).slice(0, Math.min(count, pool.length)),
      );
    }

    // Xáo thứ tự section trong đề (không đổi số lượng)
    orderedCandidates = shuffleArray(orderedCandidates);
  } else {
    // --- Chế độ mentor gốc: chia đều các chương ---
    orderedCandidates = pickSectionsDistributedAcrossChapters(candidates, pickCount);
  }

  // Có đề xuất: lấy hết orderedCandidates (đã phản ánh bank thực tế, có thể < pickCount)
  // Không đề xuất: cắt đúng pickCount section
  const maxPick = usesRecommendation ? orderedCandidates.length : pickCount;
  const picked = [];

  for (const section of orderedCandidates) {
    if (picked.length >= maxPick) break;

    const entry = await buildSectionPaperEntry(
      section,
      null, // Nghe/Đọc: không giới hạn số câu — lấy nguyên section
      section.PathId ?? section.pathId ?? null,
      loadQuestionsForSection,
    );
    if (entry) {
      picked.push(entry);
    }
  }

  return picked;
}

// =============================================================================
// PHẦN 8: RANDOM TỪ VỰNG — section theo plan, random câu trong section
// =============================================================================

/** Tìm section Từ vựng trong bank theo sectionTempId trong plan */
function findVocabularySection(sectionsData, entry) {
  const parsed = parseCourseSectionTempId(entry.sectionTempId);
  if (!parsed.sectionId) return null;

  return sectionsData.find((item) => {
    if (parsed.pathId != null) {
      // Test toàn khóa: khớp cả chương + section
      return Number(item.SectionId) === parsed.sectionId
        && Number(item.PathId) === parsed.pathId;
    }
    // Test chương: chỉ khớp sectionId
    return Number(item.SectionId) === parsed.sectionId;
  }) ?? null;
}

/**
 * Chọn section Từ vựng và random câu theo plan.
 *
 * Có vocabularyPlan → plan từ đề xuất (Case 2/3) — section có thể random mới.
 * Không có plan → sectionQuestionCounts mentor — section cố định mentor chọn.
 */
async function pickVocabularySections(sectionsData, config, loadQuestionsForSection) {
  const planEntries = Array.isArray(config.vocabularyPlan) && config.vocabularyPlan.length > 0
    ? config.vocabularyPlan
    : getSectionQuestionCountsForPart(config, SKILL_VOCABULARY).filter(
      (entry) => entry.questionCount > 0,
    );

  const picked = [];

  for (const entry of planEntries) {
    const parsed = parseCourseSectionTempId(entry.sectionTempId);
    const section = findVocabularySection(sectionsData, entry);
    // Bỏ qua nếu không tìm thấy section hoặc section tắt IsUseForTest
    if (!section || !isSectionUseForTest(section)) continue;

    const paperEntry = await buildSectionPaperEntry(
      section,
      entry.questionCount, // TV: slice đúng số câu trong plan
      parsed.pathId ?? section.PathId ?? null,
      loadQuestionsForSection,
    );
    if (paperEntry) {
      picked.push(paperEntry);
    }
  }

  return picked;
}

// =============================================================================
// PHẦN 9: VALIDATE ĐỀ SAU RANDOM — rule khác nhau lần đầu vs retake
// =============================================================================

/**
 * Kiểm tra đề đã random có khớp config không.
 * Trả mảng string lỗi — rỗng = hợp lệ.
 */
function validatePaperAgainstConfig(config, formattedSections, options = {}) {
  const errors = [];
  const chapterSectionCounts = options.chapterSectionCounts ?? config.chapterSectionCounts ?? {};

  // ----- Validate Nghe -----
  const listeningRequired = getSectionCountForPart(config, SKILL_LISTENING);
  const listeningPicked = formattedSections.filter((s) => s.skillType === SKILL_LISTENING).length;
  const listeningAllocation = chapterSectionCounts[SKILL_LISTENING];
  const hasListeningRecommendation = listeningAllocation instanceof Map && listeningAllocation.size > 0;

  if (listeningRequired > 0 && listeningPicked === 0) {
    errors.push(
      `Không có section Nghe nào được chọn (mentor config: ${listeningRequired}).`,
    );
  } else if (!hasListeningRecommendation && listeningRequired > 0 && listeningPicked < listeningRequired) {
    // Lần đầu / Case 1: bắt buộc đủ đúng sectionCount mentor
    errors.push(
      `Không đủ section Nghe (cần ${listeningRequired}, có ${listeningPicked}).`,
    );
  } else if (hasListeningRecommendation && listeningPicked > listeningRequired) {
    // Retake có đề xuất: không được VƯỢT mentor (thiếu thì OK — docx RULE bank)
    errors.push(
      `Vượt quá section Nghe mentor config (tối đa ${listeningRequired}, có ${listeningPicked}).`,
    );
  }

  // ----- Validate Đọc — logic giống Nghe -----
  const readingRequired = getSectionCountForPart(config, SKILL_READING);
  const readingPicked = formattedSections.filter((s) => s.skillType === SKILL_READING).length;
  const readingAllocation = chapterSectionCounts[SKILL_READING];
  const hasReadingRecommendation = readingAllocation instanceof Map && readingAllocation.size > 0;

  if (readingRequired > 0 && readingPicked === 0) {
    errors.push(
      `Không có section Đọc nào được chọn (mentor config: ${readingRequired}).`,
    );
  } else if (!hasReadingRecommendation && readingRequired > 0 && readingPicked < readingRequired) {
    errors.push(
      `Không đủ section Đọc (cần ${readingRequired}, có ${readingPicked}).`,
    );
  } else if (hasReadingRecommendation && readingPicked > readingRequired) {
    errors.push(
      `Vượt quá section Đọc mentor config (tối đa ${readingRequired}, có ${readingPicked}).`,
    );
  }

  // ----- Validate Từ vựng -----
  const hasVocabularyRecommendation = Array.isArray(config.vocabularyPlan) && config.vocabularyPlan.length > 0;
  const vocabularyEntries = hasVocabularyRecommendation
    ? config.vocabularyPlan
    : getSectionQuestionCountsForPart(config, SKILL_VOCABULARY);

  for (const entry of vocabularyEntries) {
    if (entry.questionCount <= 0) continue;

    const parsed = parseCourseSectionTempId(entry.sectionTempId);
    const picked = formattedSections.find((section) => {
      if (parsed.pathId != null) {
        return Number(section.sectionId) === parsed.sectionId
          && Number(section.pathId) === parsed.pathId;
      }
      return Number(section.sectionId) === parsed.sectionId;
    });
    const pickedCount = picked?.questions?.length ?? 0;

    if (!picked && entry.questionCount > 0) {
      errors.push(
        `Section từ vựng ${entry.sectionTempId} không được chọn trong đề.`,
      );
      continue;
    }

    if (pickedCount < entry.questionCount) {
      errors.push(
        `Section từ vựng ${entry.sectionTempId} thiếu câu (cần ${entry.questionCount}, có ${pickedCount}).`,
      );
    }
  }

  return errors;
}

// =============================================================================
// PHẦN 10: HÀM CHÍNH — randomizeTestPaperFromConfig
// Gọi từ studentTestPaperService.buildPaperFromConfig
// =============================================================================

/**
 * Random toàn bộ đề thi: Nghe → Đọc → Từ vựng → validate → trả về đề hoàn chỉnh.
 */
async function randomizeTestPaperFromConfig(config, sectionsData, options = {}) {
  // Destructure options: Map phân bổ Nghe/Đọc + hàm load câu từ DB
  const { chapterSectionCounts = {}, loadQuestionsForSection } = options;

  if (!config || !Array.isArray(config.questionConfigs)) {
    const error = new Error('Thiếu config bài kiểm tra từ mentor.');
    error.code = 'INSUFFICIENT_TEST_QUESTIONS';
    throw error;
  }

  if (!Array.isArray(sectionsData)) {
    const error = new Error('Thiếu dữ liệu section từ ngân hàng câu hỏi.');
    error.code = 'INSUFFICIENT_TEST_QUESTIONS';
    throw error;
  }

  if (typeof loadQuestionsForSection !== 'function') {
    throw new Error('loadQuestionsForSection is required');
  }

  const formattedSections = [];

  // --- Bước 1: Random section Nghe ---
  const listeningSections = await pickListeningReadingSections(
    sectionsData,
    SKILL_LISTENING,
    getSectionCountForPart(config, SKILL_LISTENING),
    chapterSectionCounts[SKILL_LISTENING] ?? null,
    loadQuestionsForSection,
  );
  formattedSections.push(...listeningSections);

  // --- Bước 2: Random section Đọc ---
  const readingSections = await pickListeningReadingSections(
    sectionsData,
    SKILL_READING,
    getSectionCountForPart(config, SKILL_READING),
    chapterSectionCounts[SKILL_READING] ?? null,
    loadQuestionsForSection,
  );
  formattedSections.push(...readingSections);

  // --- Bước 3: Random câu Từ vựng theo plan ---
  const vocabularySections = await pickVocabularySections(
    sectionsData,
    config,
    loadQuestionsForSection,
  );
  formattedSections.push(...vocabularySections);

  // --- Bước 4: Validate đề với config ---
  const validationErrors = validatePaperAgainstConfig(config, formattedSections, {
    chapterSectionCounts,
  });
  if (validationErrors.length > 0) {
    const error = new Error(validationErrors.join(' '));
    error.code = 'INSUFFICIENT_TEST_QUESTIONS';
    throw error;
  }

  // --- Bước 5: Tính tổng số câu ---
  const totalQuestions = formattedSections.reduce(
    (sum, section) => sum + (section.questions?.length ?? 0),
    0,
  );

  return { sections: formattedSections, totalQuestions };
}

// Chỉ export hàm chính — các helper là nội bộ file
module.exports = {
  randomizeTestPaperFromConfig,
};
