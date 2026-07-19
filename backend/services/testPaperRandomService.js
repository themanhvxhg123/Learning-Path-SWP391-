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

/** Kỹ năng Nghe — khớp SkillType trong DB và part trong config mentor */
const SKILL_LISTENING = 'LISTENING';

/** Kỹ năng Đọc — docx dùng chung quy tắc với Nghe */
const SKILL_READING = 'READING';

/** Kỹ năng Từ vựng / Ngữ pháp */
const SKILL_VOCABULARY = 'VOCABULARY';

/**
 * Kiểm tra section có được phép đưa vào bài kiểm tra không.
 *
 * Dựa cột IsUseForTest trong question bank:
 *   - true hoặc null/undefined → được dùng
 *   - false hoặc 0 → mentor đã tắt, bỏ qua khi random
 *
 * @param {object} section - Một dòng section từ question bank
 * @returns {boolean}
 */
function isSectionUseForTest(section) {
  return section?.IsUseForTest !== false && section?.IsUseForTest !== 0;
}

/**
 * Xáo trộn mảng bằng thuật toán Fisher-Yates.
 * Dùng khi cần random thứ tự section hoặc câu hỏi một cách công bằng.
 *
 * @param {Array} items - Mảng cần shuffle
 * @returns {Array} Bản sao đã xáo trộn (không mutate mảng gốc)
 */
function shuffleArray(items = []) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * Lấy entry config của một part (kỹ năng) trong questionConfigs mentor.
 *
 * @param {object} config - Config bài test
 * @param {string} part   - LISTENING | READING | VOCABULARY
 * @returns {object}
 */
function getPartConfig(config, part) {
  return (config?.questionConfigs ?? []).find((entry) => entry.part === part) ?? {};
}

/**
 * Số section mentor cấu hình cho Nghe hoặc Đọc.
 * Docx: đây là TRẦN TRÊN (tổng section sau đề xuất <= giá trị này).
 *
 * @param {object} config
 * @param {string} part
 * @returns {number}
 */
function getSectionCountForPart(config, part) {
  return Math.max(0, Number(getPartConfig(config, part).sectionCount ?? 0) || 0);
}

/**
 * Danh sách section Từ vựng + số câu mỗi section từ config mentor gốc.
 * Dùng khi chưa có vocabularyPlan (lần làm bài đầu tiên).
 *
 * @param {object} config
 * @param {string} part
 * @returns {{ sectionTempId: string, questionCount: number }[]}
 */
function getSectionQuestionCountsForPart(config, part) {
  return (getPartConfig(config, part).sectionQuestionCounts ?? [])
    .map((entry) => ({
      sectionTempId: String(entry.sectionTempId ?? ''),
      questionCount: Math.max(0, Number(entry.questionCount ?? 0) || 0),
    }))
    .filter((entry) => entry.sectionTempId);
}

/**
 * Trích sectionId từ định dạng đơn giản "section_123".
 *
 * @param {string} sectionTempId
 * @returns {number|null}
 */
function parseSectionIdFromTempId(sectionTempId) {
  const match = String(sectionTempId ?? '').match(/^section_(\d+)$/);
  return match ? Number(match[1]) : null;
}

/**
 * Phân tích sectionTempId thành pathId (chương) và sectionId.
 *
 * Định dạng bài test toàn khóa: "{pathId}::section_{sectionId}"
 * Ví dụ: "12::section_34" → chương 12, section 34
 *
 * @param {string} sectionTempId
 * @returns {{ pathId: number|null, sectionId: number|null }}
 */
function parseCourseSectionTempId(sectionTempId) {
  const raw = String(sectionTempId ?? '');
  const composite = raw.match(/^(\d+)::section_(\d+)$/);
  if (composite) {
    return {
      pathId: Number(composite[1]),
      sectionId: Number(composite[2]),
    };
  }
  return {
    pathId: null,
    sectionId: parseSectionIdFromTempId(raw),
  };
}

/**
 * Chuyển các dòng câu hỏi thô từ DB thành cấu trúc câu hỏi cho đề thi.
 *
 * - Gom theo QuestionId (một câu có nhiều dòng choice)
 * - Bỏ câu có IsUseForTest = false
 * - isMultipleChoice = true nếu có nhiều hơn 1 đáp án đúng
 *
 * @param {object[]} rawQuestions - Kết quả query question + choice theo sectionId
 * @returns {object[]}
 */
function buildQuestionsFromRows(rawQuestions = []) {
  const questionsMap = new Map();

  for (const row of rawQuestions) {
    if (row.IsUseForTest === false || row.IsUseForTest === 0) continue;

    if (!questionsMap.has(row.QuestionId)) {
      questionsMap.set(row.QuestionId, {
        tempId: row.QuestionId.toString(),
        questionText: row.Title,
        skillType: row.SkillType,
        options: [],
        correctCount: 0,
      });
    }

    if (row.ChoiceId) {
      const question = questionsMap.get(row.QuestionId);
      question.options.push({
        tempId: row.ChoiceId.toString(),
        optionText: row.ChoiceTitle,
      });
      if (row.IsTrue) question.correctCount += 1;
    }
  }

  return Array.from(questionsMap.values()).map((question) => {
    const next = {
      ...question,
      isMultipleChoice: question.correctCount > 1,
    };
    delete next.correctCount;
    return next;
  });
}

/**
 * Lấy pathId (ID chương) từ object section.
 *
 * @param {object} section
 * @returns {number|null}
 */
function getSectionPathId(section) {
  const pathId = Number(section.PathId ?? section.pathId);
  return Number.isFinite(pathId) ? pathId : null;
}

/**
 * Liệt kê các chương có section ứng viên, kèm PathOrder để sắp xếp.
 * Dùng cho logic chia đều section theo chương (lần làm đầu, chưa đề xuất).
 *
 * @param {object[]} candidates
 * @returns {{ pathId: number, pathOrder: number }[]}
 */
function getChaptersFromCandidates(candidates = []) {
  const chapterMap = new Map();

  for (const section of candidates) {
    const pathId = getSectionPathId(section);
    if (pathId == null) continue;

    if (!chapterMap.has(pathId)) {
      const pathOrder = Number(section.PathOrder ?? section.pathOrder);
      chapterMap.set(pathId, {
        pathId,
        pathOrder: Number.isFinite(pathOrder) && pathOrder > 0 ? pathOrder : pathId,
      });
    }
  }

  return Array.from(chapterMap.values())
    .sort((left, right) => left.pathOrder - right.pathOrder || left.pathId - right.pathId);
}

/**
 * Nhóm section ứng viên theo chương (pathId).
 *
 * @param {object[]} candidates
 * @returns {Map<number, object[]>}
 */
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
 * Random tối đa `count` section chưa dùng từ một chương.
 * Không lấy trùng sectionId đã có trong pickedSectionIds.
 *
 * @returns {object[]} Section vừa chọn
 */
function pickUnusedSectionsFromChapter(byChapter, pathId, count, pickedSectionIds) {
  if (count <= 0) return [];

  const pool = (byChapter.get(pathId) ?? []).filter(
    (section) => !pickedSectionIds.has(section.SectionId),
  );
  const taken = shuffleArray(pool).slice(0, Math.min(count, pool.length));

  for (const section of taken) {
    pickedSectionIds.add(section.SectionId);
  }

  return taken;
}

/**
 * Liệt kê chương còn ít nhất một section chưa được chọn.
 */
function getChaptersWithAvailableSections(chapters, byChapter, pickedSectionIds) {
  return chapters.filter((chapter) =>
    (byChapter.get(chapter.pathId) ?? []).some(
      (section) => !pickedSectionIds.has(section.SectionId),
    ));
}

/**
 * Chọn section Nghe/Đọc theo quy tắc chia đều chương (chế độ A — lần đầu).
 *
 * QUY TẮC:
 *   1. pickCount < số chương:
 *      → chọn ngẫu nhiên pickCount chương khác nhau, mỗi chương lấy 1 section.
 *      Ví dụ: pickCount=4, 5 chương → 4 chương × 1 section = 4 section.
 *
 *   2. pickCount >= số chương:
 *      → Mỗi chương lấy floor(pickCount / số chương) section (chia đều).
 *      → Phần còn thiếu (do dư pickCount % số chương HOẶC chương không đủ section cho quota):
 *        lặp random chương còn section, mỗi lần +1 section; chương hết thì loại khỏi pool.
 *      Ví dụ: pickCount=6, 5 chương → 5×1 + 1 random (vd. chương 5; hết thì lấy chương 1–4).
 *
 *   Lưu ý: Khi mentor lưu config, hệ thống đã kiểm tra sectionCount <= tổng section
 *   kỹ năng trong bank (chapterQuizConfigService / mentorChapterQuizConfigUtils).
 *   Vòng lặp bù phía trên chỉ xử lý lệch quota theo chương, không phải "bank thiếu" toàn cục.
 *
 * @param {object[]} candidates - Section ứng viên đã lọc theo kỹ năng
 * @param {number} pickCount - sectionCount mentor config
 * @returns {object[]}
 */
function pickSectionsDistributedAcrossChapters(candidates, pickCount) {
  if (pickCount <= 0) return [];

  const byChapter = groupCandidatesByChapter(candidates);
  const chapters = getChaptersFromCandidates(candidates);

  if (chapters.length === 0) {
    return shuffleArray(candidates).slice(0, pickCount);
  }

  const picked = [];
  const pickedSectionIds = new Set();

  if (pickCount < chapters.length) {
    const selectedChapters = shuffleArray(chapters).slice(0, pickCount);
    for (const chapter of selectedChapters) {
      picked.push(
        ...pickUnusedSectionsFromChapter(byChapter, chapter.pathId, 1, pickedSectionIds),
      );
    }
  } else {
    const basePerChapter = Math.floor(pickCount / chapters.length);

    for (const chapter of chapters) {
      picked.push(
        ...pickUnusedSectionsFromChapter(byChapter, chapter.pathId, basePerChapter, pickedSectionIds),
      );
    }

    // Bù phần còn thiếu: dư chia đều + chương không đủ quota basePerChapter
    while (picked.length < pickCount) {
      const eligible = getChaptersWithAvailableSections(chapters, byChapter, pickedSectionIds);
      if (eligible.length === 0) break;

      const chapter = eligible[Math.floor(Math.random() * eligible.length)];
      const taken = pickUnusedSectionsFromChapter(byChapter, chapter.pathId, 1, pickedSectionIds);
      if (taken.length === 0) break;

      picked.push(...taken);
    }
  }

  return shuffleArray(picked).slice(0, pickCount);
}

/**
 * Tạo một entry section trong đề thi hoàn chỉnh (kèm câu hỏi đã shuffle).
 *
 * @param {object} section - Section từ question bank
 * @param {number|null} limitCount - Số câu tối đa (null = lấy hết, dùng cho Nghe/Đọc)
 * @param {number|null} pathId - ID chương ghi vào đề
 * @param {Function} loadQuestionsForSection - async (sectionId) => rows từ DB
 * @returns {Promise<object|null>} null nếu section không có câu hỏi usable
 */
async function buildSectionPaperEntry(section, limitCount, pathId, loadQuestionsForSection) {
  const rawQuestions = await loadQuestionsForSection(section.SectionId);
  let questions = buildQuestionsFromRows(rawQuestions);
  questions = shuffleArray(questions);

  // Từ vựng: limitCount = số câu trong vocabularyPlan
  // Nghe/Đọc: limitCount = null → lấy toàn bộ câu trong section (docx: lấy nguyên bài)
  if (limitCount != null) {
    questions = questions.slice(0, limitCount);
  }

  if (questions.length === 0) {
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
    audioUrl: section.SkillType === SKILL_LISTENING ? (section.SourceUrl || null) : null,
    readingUrl: section.SkillType === SKILL_READING ? (section.SourceUrl || null) : null,
    questions,
  };
}

/**
 * Chọn section Nghe hoặc Đọc cho đề thi.
 *
 * HAI CHẾ ĐỘ (docx):
 *
 * A) CÓ ĐỀ XUẤT — chapterSectionCounts là Map<pathId, số section>:
 *    - Duyệt từng chương trong Map (chỉ chương weight > 0, đã loại ở bước đề xuất)
 *    - Random tối đa min(phân bổ, số section trong bank chương đó)
 *    - KHÔNG backfill từ chương khác / chương weight=0
 *    - Tổng có thể < pickCount nếu bank thiếu (docx: tổng <= mentor)
 *
 * B) CHƯA ĐỀ XUẤT — chapterSectionCounts null/rỗng:
 *    - pickSectionsDistributedAcrossChapters (chia đều + bù phần dư random)
 *    - Cắt đúng pickCount section
 *
 * @param {object[]} sectionsData - Question bank đã load
 * @param {string} skill - LISTENING hoặc READING
 * @param {number} pickCount - sectionCount mentor (trần trên khi có đề xuất)
 * @param {Map<number, number>|null} chapterSectionCounts - Phân bổ từ testRecommendationService
 * @param {Function} loadQuestionsForSection
 * @returns {Promise<object[]>}
 */
async function pickListeningReadingSections(
  sectionsData,
  skill,
  pickCount,
  chapterSectionCounts,
  loadQuestionsForSection,
) {
  if (pickCount <= 0) return [];

  // Lọc section đúng kỹ năng và được phép dùng cho test
  const candidates = sectionsData.filter(
    (section) => section.SkillType === skill && isSectionUseForTest(section),
  );

  const allocationMap = chapterSectionCounts instanceof Map ? chapterSectionCounts : null;
  const usesRecommendation = allocationMap && allocationMap.size > 0;
  let orderedCandidates;

  if (usesRecommendation) {
    // --- Chế độ đề xuất (docx Case 2/3 + RULE bank Nghe/Đọc) ---
    const byChapter = new Map();
    for (const section of candidates) {
      const pathId = getSectionPathId(section);
      if (pathId == null) continue;
      if (!byChapter.has(pathId)) byChapter.set(pathId, []);
      byChapter.get(pathId).push(section);
    }

    orderedCandidates = [];
    for (const [pathId, count] of allocationMap) {
      const pool = byChapter.get(pathId) ?? [];
      // Docx: random nếu đủ section; nếu thiếu → lấy hết section chương đó
      orderedCandidates.push(
        ...shuffleArray(pool).slice(0, Math.min(count, pool.length)),
      );
    }

    // Xáo trộn thứ tự section trong đề (không đổi số lượng)
    orderedCandidates = shuffleArray(orderedCandidates);
  } else {
    // --- Chế độ mentor gốc (lần làm đầu / Case 1) ---
    orderedCandidates = pickSectionsDistributedAcrossChapters(candidates, pickCount);
  }

  // Có đề xuất: lấy hết orderedCandidates (đã phản ánh bank thực tế)
  // Không đề xuất: tối đa pickCount section
  const maxPick = usesRecommendation ? orderedCandidates.length : pickCount;
  const picked = [];

  for (const section of orderedCandidates) {
    if (picked.length >= maxPick) break;

    const entry = await buildSectionPaperEntry(
      section,
      null,
      section.PathId ?? section.pathId ?? null,
      loadQuestionsForSection,
    );
    if (entry) {
      picked.push(entry);
    }
  }

  return picked;
}

/**
 * Tìm section Từ vựng trong question bank theo sectionTempId trong plan.
 *
 * @param {object[]} sectionsData
 * @param {{ sectionTempId: string }} entry
 * @returns {object|null}
 */
function findVocabularySection(sectionsData, entry) {
  const parsed = parseCourseSectionTempId(entry.sectionTempId);
  if (!parsed.sectionId) return null;

  return sectionsData.find((item) => {
    if (parsed.pathId != null) {
      return Number(item.SectionId) === parsed.sectionId
        && Number(item.PathId) === parsed.pathId;
    }
    return Number(item.SectionId) === parsed.sectionId;
  }) ?? null;
}

/**
 * Chọn section Từ vựng và random câu theo plan.
 *
 * Nguồn plan:
 *   - Có đề xuất: config.vocabularyPlan (từ recommendVocabularyPlan)
 *   - Lần đầu: sectionQuestionCounts trong config mentor
 *
 * Docx bước 4: mỗi section lấy đúng questionCount câu (đã tính ở bước đề xuất).
 * Ví dụ weight=0: plan không chứa chương đó → tổng câu có thể < mentor (30 <= 49).
 *
 * @param {object[]} sectionsData
 * @param {object} config
 * @param {Function} loadQuestionsForSection
 * @returns {Promise<object[]>}
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
    if (!section || !isSectionUseForTest(section)) continue;

    const paperEntry = await buildSectionPaperEntry(
      section,
      entry.questionCount,
      parsed.pathId ?? section.PathId ?? null,
      loadQuestionsForSection,
    );
    if (paperEntry) {
      picked.push(paperEntry);
    }
  }

  return picked;
}

/**
 * Kiểm tra đề đã random có hợp lệ với config không.
 *
 * NGHE / ĐỌC:
 *   - Không có đề xuất: bắt buộc đủ sectionCount mentor
 *   - Có đề xuất (chapterSectionCounts Map): chỉ cần > 0 và <= mentor
 *     (cho phép thiếu section khi bank không đủ — docx RULE)
 *
 * TỪ VỰNG:
 *   - Kiểm tra từng entry trong vocabularyPlan (hoặc mentor gốc)
 *   - Mỗi section phải có trong đề và đủ số câu questionCount
 *
 * @param {object} config
 * @param {object[]} formattedSections - Đề đã build
 * @param {object} [options]
 * @param {object} [options.chapterSectionCounts] - Map phân bổ Nghe/Đọc từ đề xuất
 * @returns {string[]} Danh sách lỗi (rỗng = hợp lệ)
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
    // Lần đầu: phải đủ đúng số section mentor
    errors.push(
      `Không đủ section Nghe (cần ${listeningRequired}, có ${listeningPicked}).`,
    );
  } else if (hasListeningRecommendation && listeningPicked > listeningRequired) {
    // Docx: tổng sau đề xuất <= mentor — không được vượt
    errors.push(
      `Vượt quá section Nghe mentor config (tối đa ${listeningRequired}, có ${listeningPicked}).`,
    );
  }

  // ----- Validate Đọc (cùng logic Nghe) -----
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

/**
 * Hàm chính — random toàn bộ đề thi từ config + question bank.
 *
 * Thứ tự ghép đề: Nghe → Đọc → Từ vựng (theo thứ tự kỹ năng trong UI).
 *
 * @param {object} config - Config mentor hoặc config đã đề xuất
 *   Có thể chứa thêm:
 *     - chapterSectionCounts: { LISTENING: Map, READING: Map }
 *     - vocabularyPlan: [{ sectionTempId, questionCount }, ...]
 * @param {object[]} sectionsData - Question bank
 * @param {object} [options]
 * @param {object} [options.chapterSectionCounts] - Override Map phân bổ (từ studentTestPaperService)
 * @param {Function} options.loadQuestionsForSection - Bắt buộc: load câu hỏi theo sectionId
 * @returns {Promise<{ sections: object[], totalQuestions: number }>}
 */
async function randomizeTestPaperFromConfig(config, sectionsData, options = {}) {
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

  const listeningSections = await pickListeningReadingSections(
    sectionsData,
    SKILL_LISTENING,
    getSectionCountForPart(config, SKILL_LISTENING),
    chapterSectionCounts[SKILL_LISTENING] ?? null,
    loadQuestionsForSection,
  );
  formattedSections.push(...listeningSections);

  const readingSections = await pickListeningReadingSections(
    sectionsData,
    SKILL_READING,
    getSectionCountForPart(config, SKILL_READING),
    chapterSectionCounts[SKILL_READING] ?? null,
    loadQuestionsForSection,
  );
  formattedSections.push(...readingSections);

  const vocabularySections = await pickVocabularySections(
    sectionsData,
    config,
    loadQuestionsForSection,
  );
  formattedSections.push(...vocabularySections);

  const validationErrors = validatePaperAgainstConfig(config, formattedSections, {
    chapterSectionCounts,
  });
  if (validationErrors.length > 0) {
    const error = new Error(validationErrors.join(' '));
    error.code = 'INSUFFICIENT_TEST_QUESTIONS';
    throw error;
  }

  const totalQuestions = formattedSections.reduce(
    (sum, section) => sum + (section.questions?.length ?? 0),
    0,
  );

  return { sections: formattedSections, totalQuestions };
}

module.exports = {
  randomizeTestPaperFromConfig,
};
