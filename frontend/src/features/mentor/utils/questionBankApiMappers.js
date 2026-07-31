import {
  READING_SOURCE_COMPOSE,
  READING_SOURCE_UPLOAD,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
  normalizeQuestionBankSkillType,
  buildQuestionContentSnapshot,
  buildTestQuestionPayload,
  buildTestSectionPayload,
  cloneSectionQuestions,
  getFilledTestQuestions,
  hasPendingPersistedQuestionDeletes,
  isFilledTestQuestion,
  LISTENING_SOURCE_LINK,
  getListeningSectionFields,
  getReadingSectionFields,
  normalizeQuestionBankSectionForSave,
} from '@/features/mentor/utils/mentorTestContentUtils';
import { isHtmlContentEmpty } from '@/features/mentor/utils/mentorCourseContentUtils';
import { fetchTextMaterialHtml } from '@/features/mentor/services/materialUploadService';

/**
 * =============================================================================
 * questionBankApiMappers.js — Chuyển đổi dữ liệu API ↔ Editor format
 * =============================================================================
 *
 * MỤC ĐÍCH: Map dữ liệu từ REST API sang format editor (và ngược lại khi lưu).
 *
 * CÁC NHÓM HÀM:
 *   - mapApiSectionToEditorSection / mapApiQuestionToEditorQuestion: API → editor
 *   - mergeQuestionsIntoSection / hydrateReadingSectionFromSourceUrl: bổ sung dữ liệu
 *   - buildSectionEditorSnapshot / buildSectionBaselinesMap: baseline so sánh thay đổi
 *   - hasSectionUnsavedChanges / hasQuestionBankWorkspaceChanges: phát hiện dirty
 *   - buildQuestionBankSectionSavePayload / serializeQuestionBankSavePayload: editor → API payload
 *   - revertSectionToSavedBaseline: hoàn tác thay đổi chưa lưu
 */

function toBooleanDefaultTrue(value) {
  if (value == null) return true;
  return Boolean(value);
}

function resolveSectionSourceUrlFromApi(apiSection = {}) {
  const raw =
    apiSection.SourceUrl
    ?? apiSection.sourceUrl
    ?? apiSection.audioUrl
    ?? apiSection.materialUrl
    ?? '';
  return String(raw).trim();
}

function resolveSectionSourceUrlForSave(sectionPayload = {}) {
  const skill = sectionPayload.SkillType;
  if (skill === TEST_SKILL_LISTENING) {
    return String(sectionPayload.AudioUrl ?? '').trim() || null;
  }
  if (skill === TEST_SKILL_READING) {
    return String(sectionPayload.MaterialUrl ?? '').trim() || null;
  }
  return String(sectionPayload.MaterialUrl ?? sectionPayload.AudioUrl ?? '').trim() || null;
}

function buildQuestionSaveSnapshot(question) {
  const payload = buildTestQuestionPayload(question);
  return JSON.stringify({
    QuestionText: payload.QuestionText,
    isActive: payload.isActive,
    isUseForTest: payload.isUseForTest,
    Options: payload.Options,
  });
}

// ===== API → EDITOR =====

/** Chuyển object section từ API response sang format editor (tempId, Questions, SkillType...). */
export function mapApiSectionToEditorSection(apiSection) {
  const skillType = normalizeQuestionBankSkillType(
    apiSection.skillType ?? TEST_SKILL_VOCABULARY,
    apiSection.typeId,
  );
  const sectionName = String(apiSection.sectionName ?? '').trim();
  const displayName = String(apiSection.displayName ?? sectionName);
  const sourceUrl = resolveSectionSourceUrlFromApi(apiSection);

  const base = {
    tempId: `section_${apiSection.sectionId}`,
    SectionId: apiSection.sectionId,
    DisplayName: sectionName,
    SectionTitle: displayName || sectionName,
    SkillType: skillType,
    typeId: apiSection.typeId ?? null,
    Description: '',
    Questions: [],
    questionsLoaded: false,
    questionsLoading: false,
    questionCount: Number(apiSection.questionCount) || 0,
    sectionOrder: Number(apiSection.order) || 0,
    isUseForTest: toBooleanDefaultTrue(apiSection.isUseForTest),
    ...(skillType === TEST_SKILL_LISTENING ? getListeningSectionFields() : {}),
    ...(skillType === TEST_SKILL_READING ? getReadingSectionFields() : {}),
  };

  if (skillType === TEST_SKILL_LISTENING) {
    base.AudioUrl = sourceUrl;
    if (sourceUrl) {
      base.AudioSourceType = LISTENING_SOURCE_LINK;
    }
  }

  if (skillType === TEST_SKILL_READING && sourceUrl) {
    base.MaterialUrl = sourceUrl;
    base.ReadingSourceType = READING_SOURCE_UPLOAD;
  }

  return base;
}

/** Tải HTML bài đọc từ SourceUrl/MaterialUrl (Cloudinary) vào Description để hiển thị preview. */
export async function hydrateReadingSectionFromSourceUrl(section) {
  const isReading =
    section?.SkillType === TEST_SKILL_READING || Number(section?.TypeId) === 2;
  if (!isReading) return section;

  const materialUrl = String(
    section.MaterialUrl ?? section.SourceUrl ?? '',
  ).trim();
  if (!materialUrl) return section;
  if (!isHtmlContentEmpty(section.Description)) return section;

  try {
    const html = await fetchTextMaterialHtml(materialUrl);
    if (!html || isHtmlContentEmpty(html)) return section;

    return {
      ...section,
      Description: html,
      ReadingSourceType: READING_SOURCE_COMPOSE,
    };
  } catch {
    return section;
  }
}

/** API path/questions trả SourceUrl — editor nghe/đọc dùng field khác. */
export function mapPathSectionFromApi(section = {}) {
  const sourceUrl = resolveSectionSourceUrlFromApi(section);
  const typeId = Number(section.TypeId);
  const next = {
    ...section,
    tempId: section.tempId ?? `section_${section.SectionId}`,
    sectionOrder: Number(section.Order ?? section.sectionOrder) || 0,
    // Questions: id ổn định cho mục lục + scroll
    Questions: (section.Questions ?? []).map((question) => ({
      ...question,
      tempId: question.tempId ?? `question_${question.QuestionId}`,
    })),
  };

  const skillByTypeId = {
    1: TEST_SKILL_LISTENING,
    2: TEST_SKILL_READING,
    3: TEST_SKILL_VOCABULARY,
  };
  if (skillByTypeId[typeId]) {
    next.SkillType = skillByTypeId[typeId];
  }

  if (typeId === 1 && sourceUrl) {
    next.AudioUrl = sourceUrl;
    next.AudioSourceType = LISTENING_SOURCE_LINK;
  }

  if (typeId === 2 && sourceUrl) {
    next.MaterialUrl = sourceUrl;
    next.SkillType = TEST_SKILL_READING;
    next.ReadingSourceType = READING_SOURCE_UPLOAD;
  }

  const useForTestRaw = section.IsUseForTest ?? section.isUseForTest;
  const useForTestOn = useForTestRaw == null ? true : useForTestRaw !== false && useForTestRaw !== 0;
  next.isUseForTest = useForTestOn;
  next.IsUseForTest = useForTestOn;

  return next;
}

/** Map + tải nội dung bài đọc để preview trong editor. */
export async function loadPathSectionsForEditor(pathSections = []) {
  const mapped = pathSections.map(mapPathSectionFromApi);
  return Promise.all(mapped.map((section) => hydrateReadingSectionFromSourceUrl(section)));
}

/** Chuyển object question từ API sang format editor. */
export function mapApiQuestionToEditorQuestion(apiQuestion, section = {}) {
  const choices = (apiQuestion.choices ?? []).map((choice) => ({
    tempId: `choice_${choice.choiceId}`,
    ChoiceId: choice.choiceId,
    OptionText: choice.title ?? '',
    IsCorrect: Boolean(choice.isTrue),
  }));

  return {
    tempId: `question_${apiQuestion.questionId}`,
    QuestionId: apiQuestion.questionId,
    // typeId / SkillType lấy từ section (API join Question_Sections + Section_Type)
    typeId: apiQuestion.typeId ?? section.typeId ?? null,
    SkillType: normalizeQuestionBankSkillType(
      apiQuestion.skillType ?? section.SkillType ?? null,
      apiQuestion.typeId ?? section.typeId ?? null,
    ),
    QuestionText: apiQuestion.title ?? '',
    Score: 1,
    order: Number(apiQuestion.order) || 0,
    sourceUrl: apiQuestion.sourceUrl ?? null,
    isActive: toBooleanDefaultTrue(apiQuestion.isActive),
    isUseForTest: toBooleanDefaultTrue(apiQuestion.isUseForTest),
    Options: choices,
  };
}

/** Gộp mảng câu hỏi API vào section editor. */
export function mergeQuestionsIntoSection(section, apiQuestions = []) {
  const activeQuestions = (apiQuestions ?? []).filter((item) => item.isActive !== false);
  const questions = activeQuestions.map((item) => mapApiQuestionToEditorQuestion(item, section));
  const nextSection = {
    ...section,
    Questions: questions,
    questionsLoaded: true,
    questionsLoading: false,
    questionCount: activeQuestions.length || section.questionCount || 0,
  };

  if (section.SkillType === TEST_SKILL_LISTENING) {
    const audioUrl =
      String(section.AudioUrl ?? '').trim() ||
      activeQuestions.find((item) => item.url)?.url ||
      '';
    if (audioUrl) {
      nextSection.AudioUrl = audioUrl;
      nextSection.AudioSourceType = LISTENING_SOURCE_LINK;
    }
  }

  return nextSection;
}

// ===== BASELINE & DIRTY DETECTION =====

export function getSectionDisplayQuestionCount(section) {
  const loadedCount = (section?.Questions ?? []).filter(
    (question) => String(question?.QuestionText ?? '').trim(),
  ).length;
  if (loadedCount > 0) return loadedCount;
  return Number(section?.questionCount) || 0;
}

function hasPendingUploadFile(section) {
  return typeof File !== 'undefined' && section?.File instanceof File;
}

/** Snapshot phần nguồn (file / soạn thảo) — dùng cho Nghe & Đọc. */
export function buildSectionSourceSnapshot(section) {
  const normalized = normalizeQuestionBankSectionForSave(section ?? {});
  const skill = normalized.SkillType;

  if (skill === TEST_SKILL_LISTENING) {
    return JSON.stringify({
      AudioUrl: String(normalized.AudioUrl ?? '').trim(),
    });
  }

  if (skill === TEST_SKILL_READING) {
    const readingSourceType =
      normalized.ReadingSourceType === READING_SOURCE_UPLOAD
        ? READING_SOURCE_UPLOAD
        : READING_SOURCE_COMPOSE;

    return JSON.stringify({
      ReadingSourceType: readingSourceType,
      MaterialUrl: String(normalized.MaterialUrl ?? '').trim(),
      Description: String(normalized.Description ?? ''),
    });
  }

  return null;
}

export function buildSectionSourceBaselinesMap(sections = []) {
  return Object.fromEntries(
    (sections ?? [])
      .filter((section) => section?.tempId && buildSectionSourceSnapshot(section) != null)
      .map((section) => [section.tempId, buildSectionSourceSnapshot(section)]),
  );
}

export function isSectionSourceDirty(section, sourceBaselines = {}) {
  if (!section?.tempId) return false;
  if (hasPendingUploadFile(section)) return true;

  const snapshot = buildSectionSourceSnapshot(section);
  if (snapshot == null) return false;

  const baseline = sourceBaselines[section.tempId];
  if (baseline == null) return true;
  return snapshot !== baseline;
}

function isSectionMetaDirty(section, baselines = {}) {
  if (!section?.tempId) return false;

  const baselineJson = baselines[section.tempId];
  if (baselineJson == null) return false;

  try {
    const normalized = normalizeQuestionBankSectionForSave(section ?? {});
    const baseline = JSON.parse(baselineJson);

    const currentDisplayName = String(normalized.DisplayName ?? '').trim();
    const baselineDisplayName = String(baseline.DisplayName ?? '').trim();
    const currentSectionTitle = String(normalized.SectionTitle ?? '');
    const baselineSectionTitle = String(baseline.SectionTitle ?? '');

    return (
      currentDisplayName !== baselineDisplayName
      || currentSectionTitle !== baselineSectionTitle
      || toBooleanDefaultTrue(normalized.isUseForTest) !== toBooleanDefaultTrue(baseline.isUseForTest)
    );
  } catch {
    return false;
  }
}

function getSectionQuestionsSnapshotList(section) {
  const normalized = normalizeQuestionBankSectionForSave(section ?? {});
  return getFilledTestQuestions(normalized.Questions).map((question) =>
    buildQuestionSaveSnapshot(question),
  );
}

export function isSectionQuestionsDirty(section, baselines = {}) {
  if (!section?.tempId) return false;

  const baselineJson = baselines[section.tempId];
  if (baselineJson == null) return false;

  try {
    const baselinePayload = JSON.parse(baselineJson);
    const baselineQuestions = baselinePayload.Questions ?? [];
    const currentQuestions = getSectionQuestionsSnapshotList(section);
    return JSON.stringify(currentQuestions) !== JSON.stringify(baselineQuestions);
  } catch {
    return false;
  }
}

/** Nghe/Đọc: dirty khi đổi file/soạn thảo hoặc thay đổi câu hỏi; Viết: dirty toàn section. */
export function isSectionSaveDirty(section, baselines = {}, sourceBaselines = {}) {
  const skill = section?.SkillType;
  if (skill === TEST_SKILL_LISTENING || skill === TEST_SKILL_READING) {
    return (
      isSectionMetaDirty(section, baselines) ||
      isSectionSourceDirty(section, sourceBaselines) ||
      isSectionQuestionsDirty(section, baselines)
    );
  }
  return isSectionEditorDirty(section, baselines);
}

/** Section khớp baseline (kể cả sau khi khôi phục câu hỏi đã xóa). */
export function isSectionSyncedWithBaseline(section, baselines = {}, sourceBaselines = {}) {
  if (!section?.tempId) return true;
  // Chỉ câu đã lưu DB bị xóa mới cần Cập nhật; câu mới local vẫn hiện trong danh sách đã xóa.
  if (hasPendingPersistedQuestionDeletes(section)) return false;
  return !isSectionSaveDirty(section, baselines, sourceBaselines);
}

/** Kiểm tra section có thay đổi chưa lưu (so với baseline). */
export function hasSectionUnsavedChanges(section, baselines = {}, sourceBaselines = {}) {
  return !isSectionSyncedWithBaseline(section, baselines, sourceBaselines);
}

/** Kiểm tra workspace có thay đổi chưa lưu (dựa trên section đang active). */
export function hasQuestionBankWorkspaceChanges(
  _sections = [],
  activeSection,
  baselines = {},
  sourceBaselines = {},
) {
  if (!activeSection) return false;
  return hasSectionUnsavedChanges(activeSection, baselines, sourceBaselines);
}

function isNonJsonSerializable(value) {
  if (value == null) return false;
  if (typeof File !== 'undefined' && value instanceof File) return true;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  return typeof value === 'function' || typeof value === 'symbol';
}

/** Loại bỏ File/Blob và đảm bảo payload gửi API là JSON thuần. */
export function serializeQuestionBankSavePayload(payload) {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload lưu section không hợp lệ.');
  }

  try {
    return JSON.parse(JSON.stringify(payload, (_key, value) => {
      if (isNonJsonSerializable(value)) return undefined;
      return value;
    }));
  } catch {
    throw new Error('Payload chứa dữ liệu không thể chuyển thành JSON.');
  }
}

/** Reset phần Questions trong baseline về trạng thái ban đầu sau khi khôi phục hết câu đã xóa. */
export function applyInitialQuestionsBaseline(section, sectionBaselines = {}, initialSectionBaselines = {}) {
  const tempId = section?.tempId;
  if (!tempId) return sectionBaselines;

  const initialJson = initialSectionBaselines[tempId];
  if (!initialJson) return sectionBaselines;

  try {
    const initialPayload = JSON.parse(initialJson);
    const currentJson = sectionBaselines[tempId] ?? initialJson;
    const currentPayload = JSON.parse(currentJson);

    return {
      ...sectionBaselines,
      [tempId]: JSON.stringify({
        ...currentPayload,
        Questions: initialPayload.Questions ?? [],
      }),
    };
  } catch {
    return sectionBaselines;
  }
}

/** Khôi phục section về trạng thái đã lưu (baseline) khi user bỏ qua thay đổi. */
export function revertSectionToSavedBaseline(section, baselines = {}, sourceBaselines = {}) {
  if (!section?.tempId) return section;

  const baselineJson = baselines[section.tempId];
  if (!baselineJson) return section;

  try {
    const payload = JSON.parse(baselineJson);
    const next = { ...section };

    next.SectionTitle = payload.SectionTitle ?? next.SectionTitle;
    next.DisplayName = payload.DisplayName ?? next.DisplayName;
    next.isUseForTest = payload.isUseForTest ?? next.isUseForTest;
    next.Description = payload.Description ?? next.Description ?? '';
    next.MaterialUrl = payload.MaterialUrl ?? '';
    next.DeletedQuestions = [];
    delete next.File;

    if (section.InitialQuestions) {
      next.Questions = cloneSectionQuestions(section.InitialQuestions);
    }

    if (section.SkillType === TEST_SKILL_LISTENING) {
      next.AudioUrl = payload.AudioUrl ?? '';
      next.FileName = payload.FileName ?? null;
      next.FileSize = payload.FileSize ?? null;
      next.AudioSourceType = payload.AudioSourceType ?? next.AudioSourceType;
    }

    if (section.SkillType === TEST_SKILL_READING) {
      next.ReadingSourceType = payload.ReadingSourceType ?? next.ReadingSourceType;
    }

    const sourceJson = sourceBaselines[section.tempId];
    if (sourceJson) {
      const source = JSON.parse(sourceJson);
      if (section.SkillType === TEST_SKILL_LISTENING) {
        next.AudioUrl = source.AudioUrl ?? next.AudioUrl;
        next.FileName = source.FileName ?? next.FileName;
        next.FileSize = source.FileSize ?? next.FileSize;
        next.AudioSourceType = source.AudioSourceType ?? next.AudioSourceType;
        delete next.File;
      }
      if (section.SkillType === TEST_SKILL_READING) {
        next.Description = source.Description ?? next.Description;
        next.ReadingSourceType = source.ReadingSourceType ?? next.ReadingSourceType;
      }
    }

    return next;
  } catch {
    return section;
  }
}

/** Snapshot so sánh section đã lưu vs đang chỉnh (không gồm File blob). */
export function buildSectionEditorSnapshot(section) {
  const normalized = normalizeQuestionBankSectionForSave(section ?? {});
  const payload = {
    SectionTitle: normalized.SectionTitle,
    DisplayName: normalized.DisplayName,
    isUseForTest: toBooleanDefaultTrue(normalized.isUseForTest),
    Description: normalized.Description,
    SkillType: normalized.SkillType,
    MaterialUrl: String(normalized.MaterialUrl ?? '').trim(),
    FileName: normalized.FileName ?? null,
    FileSize: normalized.FileSize ?? null,
    AudioUrl: String(normalized.AudioUrl ?? '').trim(),
    AudioSourceType: normalized.AudioSourceType ?? null,
    ReadingSourceType: normalized.ReadingSourceType ?? null,
    Questions: getFilledTestQuestions(normalized.Questions).map((question) =>
      buildQuestionSaveSnapshot(question),
    ),
  };

  if (normalized.SkillType === TEST_SKILL_LISTENING) {
    const title = String(normalized.SectionTitle ?? '').trim();
    const desc = String(normalized.Description ?? '').trim();
    payload.ListeningPrompt = title && desc ? `${title}\n\n${desc}` : title || desc;
  }

  if (normalized.SkillType === TEST_SKILL_READING) {
    payload.ReadingSourceType =
      normalized.ReadingSourceType === READING_SOURCE_COMPOSE
        ? READING_SOURCE_COMPOSE
        : normalized.ReadingSourceType;
  }

  return JSON.stringify(payload);
}

export function buildSectionBaselinesMap(sections = []) {
  return Object.fromEntries(
    (sections ?? [])
      .filter((section) => section?.tempId)
      .map((section) => [section.tempId, buildSectionEditorSnapshot(section)]),
  );
}

export function isSectionEditorDirty(section, baselines = {}) {
  if (!section?.tempId) return false;
  const baseline = baselines[section.tempId];
  if (baseline == null) return true;
  return buildSectionEditorSnapshot(section) !== baseline;
}

export function getDirtySectionTempIds(sections = [], baselines = {}) {
  return (sections ?? [])
    .filter((section) => isSectionEditorDirty(section, baselines))
    .map((section) => section.tempId);
}

export function countQuestionsBySkillFromSections(sections = []) {
  return sections.reduce(
    (acc, section) => {
      const skill = section?.SkillType;
      if (!skill) return acc;
      acc[skill] = (acc[skill] ?? 0) + getSectionDisplayQuestionCount(section);
      return acc;
    },
    {
      [TEST_SKILL_LISTENING]: 0,
      [TEST_SKILL_READING]: 0,
      [TEST_SKILL_VOCABULARY]: 0,
    },
  );
}

function stripSectionFileBlob(sectionPayload = {}) {
  const { File: _file, ...rest } = sectionPayload;
  return rest;
}

function buildSectionPayloadForPreview(section, sectionOrder) {
  const normalized = normalizeQuestionBankSectionForSave(section ?? {});
  let sectionPayload = stripSectionFileBlob(buildTestSectionPayload(normalized, sectionOrder));

  if (normalized.SectionId) {
    sectionPayload = { ...sectionPayload, SectionId: normalized.SectionId };
  }

  return { normalized, sectionPayload };
}

function buildChoiceApiRows(question) {
  return (question.Options ?? [])
    .map((option, index) => buildChoiceRowFromOption(option, index + 1))
    .filter((choice) => choice.Title);
}

function buildChoiceInsertRows(question) {
  return (question.Options ?? [])
    .map((option, index) => {
      const data = buildChoiceRowFromOption(option, index + 1);
      if (!data.Title) return null;
      return {
        table: 'Question_Choices',
        clientRef: option.tempId ?? null,
        data,
      };
    })
    .filter(Boolean);
}

function buildQuestionApiData(question) {
  const payload = buildTestQuestionPayload(question);
  return {
    Title: payload.QuestionText,
    IsActive: payload.isActive,
    IsUseForTest: payload.isUseForTest,
  };
}

function buildSectionApiData(normalized, sectionPayload = {}) {
  const sectionName = String(sectionPayload.DisplayName ?? '').trim() || null;
  const rawTitle = String(sectionPayload.SectionTitle ?? '');
  const title = rawTitle === '' ? sectionName : rawTitle;

  return {
    SectionName: sectionName,
    Title: title,
    SkillType: sectionPayload.SkillType ?? null,
    TypeId: sectionPayload.typeId ?? null,
    IsUseForTest: sectionPayload.isUseForTest !== false,
    SourceUrl: resolveSectionSourceUrlForSave({
      SkillType: normalized.SkillType,
      AudioUrl: normalized.AudioUrl,
      MaterialUrl: normalized.MaterialUrl,
    }),
  };
}

const SECTION_FIELD_BASELINE_MAP = {
  DisplayName: 'SectionName',
  SectionTitle: 'Title',
};

function resolveBaselineSourceUrl(baseline = {}, skillType) {
  return resolveSectionSourceUrlForSave({
    SkillType: skillType,
    AudioUrl: baseline.AudioUrl,
    MaterialUrl: baseline.MaterialUrl,
  }) ?? '';
}

function resolveSectionSourceBaselineUrl(baselines = {}, sourceBaselines = {}, tempId, skillType) {
  const sourceJson = sourceBaselines[tempId];
  if (sourceJson) {
    try {
      const source = JSON.parse(sourceJson);
      return String(source.AudioUrl ?? source.MaterialUrl ?? '').trim();
    } catch {
      // ignore invalid source baseline
    }
  }

  try {
    const baselineJson = baselines[tempId];
    const baseline = baselineJson ? JSON.parse(baselineJson) : null;
    if (baseline) {
      return resolveBaselineSourceUrl(baseline, skillType);
    }
  } catch {
    // ignore invalid baseline
  }

  return '';
}

function buildSectionSourceUpdate(normalized, baselines = {}, sourceBaselines = {}, tempId, sectionId) {
  if (!sectionId) return null;

  const currentUrl = resolveSectionSourceUrlForSave({
    SkillType: normalized.SkillType,
    AudioUrl: normalized.AudioUrl,
    MaterialUrl: normalized.MaterialUrl,
  }) ?? '';
  const baselineUrl = resolveSectionSourceBaselineUrl(
    baselines,
    sourceBaselines,
    tempId,
    normalized.SkillType,
  );

  if (currentUrl === baselineUrl) return null;

  return {
    table: 'Question_Sections',
    sectionId,
    SourceUrl: currentUrl || null,
  };
}

function buildSectionUpdateSet(sectionPayload, baselines = {}, _sourceBaselines = {}, tempId) {
  const set = {};

  try {
    const baselineJson = baselines[tempId];
    const baseline = baselineJson ? JSON.parse(baselineJson) : null;

    if (baseline) {
      Object.entries(SECTION_FIELD_BASELINE_MAP).forEach(([baselineKey, apiKey]) => {
        const currentValue = sectionPayload[baselineKey] ?? null;
        const baselineValue = baseline[baselineKey] ?? null;
        if (String(currentValue ?? '') !== String(baselineValue ?? '')) {
          set[apiKey] = currentValue;
        }
      });

      const currentUseForTest = sectionPayload.isUseForTest !== false;
      const baselineUseForTest = baseline.isUseForTest !== false;
      if (currentUseForTest !== baselineUseForTest) {
        set.IsUseForTest = currentUseForTest;
      }
    }
  } catch {
    // ignore invalid baseline
  }

  return set;
}

function buildChoiceRowFromOption(option, order) {
  return {
    Title: String(option?.OptionText ?? '').trim(),
    Order: order,
    IsTrue: option?.IsCorrect ? 1 : 0,
  };
}

function buildChoiceUpdatePlan(current, initial) {
  const choicesInsert = [];
  const choicesUpdate = [];
  const choicesDelete = [];

  const currentOptions = current?.Options ?? [];
  const initialOptions = initial?.Options ?? [];
  const initialByChoiceId = new Map(
    initialOptions
      .filter((option) => option?.ChoiceId)
      .map((option) => [Number(option.ChoiceId), option]),
  );
  const matchedChoiceIds = new Set();

  currentOptions.forEach((option, index) => {
    const order = index + 1;
    const row = buildChoiceRowFromOption(option, order);
    const choiceId = option?.ChoiceId ? Number(option.ChoiceId) : null;

    if (choiceId && initialByChoiceId.has(choiceId)) {
      matchedChoiceIds.add(choiceId);
      const initialOption = initialByChoiceId.get(choiceId);
      const initialIndex = initialOptions.findIndex((item) => Number(item.ChoiceId) === choiceId);
      const initialOrder = initialIndex >= 0 ? initialIndex + 1 : order;
      const initialRow = buildChoiceRowFromOption(initialOption, initialOrder);
      const set = {};

      if (row.Title !== initialRow.Title) set.Title = row.Title;
      if (row.Order !== initialRow.Order) set.Order = row.Order;
      if (row.IsTrue !== initialRow.IsTrue) set.IsTrue = row.IsTrue;

      if (Object.keys(set).length > 0) {
        choicesUpdate.push({
          table: 'Question_Choices',
          choiceId,
          questionId: current.QuestionId,
          set,
        });
      }
      return;
    }

    choicesInsert.push({
      table: 'Question_Choices',
      clientRef: option.tempId,
      data: row,
    });
  });

  initialOptions.forEach((option) => {
    const choiceId = option?.ChoiceId ? Number(option.ChoiceId) : null;
    if (choiceId && !matchedChoiceIds.has(choiceId)) {
      choicesDelete.push({
        table: 'Question_Choices',
        choiceId,
        questionId: current.QuestionId,
      });
    }
  });

  return { choicesInsert, choicesUpdate, choicesDelete };
}

function buildQuestionUpdatePatch(current, initial) {
  const currentPayload = buildTestQuestionPayload(current);
  const initialPayload = buildTestQuestionPayload(initial);
  const set = {};

  if (currentPayload.QuestionText !== initialPayload.QuestionText) {
    set.Title = currentPayload.QuestionText;
  }
  if (currentPayload.isActive !== initialPayload.isActive) {
    set.IsActive = currentPayload.isActive;
  }
  if (currentPayload.isUseForTest !== initialPayload.isUseForTest) {
    set.IsUseForTest = currentPayload.isUseForTest;
  }

  const { choicesInsert, choicesUpdate, choicesDelete } = buildChoiceUpdatePlan(current, initial);

  return {
    set,
    choicesInsert,
    choicesUpdate,
    choicesDelete,
  };
}

function countChoiceUpdates(questionsUpdate = []) {
  return questionsUpdate.reduce((sum, item) => sum + (item.choicesUpdate?.length ?? 0), 0);
}

function countChoiceInserts(questionsUpdate = [], questionsInsert = []) {
  const fromUpdates = questionsUpdate.reduce((sum, item) => sum + (item.choicesInsert?.length ?? 0), 0);
  const fromInserts = questionsInsert.reduce((sum, item) => sum + (item.choicesInsert?.length ?? 0), 0);
  return fromUpdates + fromInserts;
}

function countChoiceDeletes(questionsUpdate = []) {
  return questionsUpdate.reduce((sum, item) => sum + (item.choicesDelete?.length ?? 0), 0);
}

function buildQuestionsDeleteRows(sectionId, currentQuestions, initialQuestions, deletedQuestions = []) {
  const rows = [];
  const seen = new Set();

  initialQuestions.forEach((initial) => {
    if (!isFilledTestQuestion(initial) || !initial.QuestionId) return;
    const stillExists = currentQuestions.some((question) => question.tempId === initial.tempId);
    if (stillExists) return;

    const questionId = Number(initial.QuestionId);
    if (!questionId || seen.has(questionId)) return;
    seen.add(questionId);
    rows.push({
      table: 'Questions',
      questionId,
      sectionId,
    });
  });

  deletedQuestions.forEach((deleted) => {
    const questionId = Number(deleted?.QuestionId);
    if (!questionId || seen.has(questionId)) return;
    seen.add(questionId);
    rows.push({
      table: 'Questions',
      questionId,
      sectionId,
    });
  });

  return rows;
}

/** Chỉ xóa câu hỏi — không đổi section / nguồn đề / nội dung câu còn lại. */
export function isQuestionBankDeleteOnlyPayload(payload) {
  if (!payload) return false;
  if ((payload.questionsDelete?.length ?? 0) === 0) return false;
  if (payload.sectionInsert || payload.sectionUpdate || payload.sectionSourceUpdate) return false;
  if ((payload.questionsInsert?.length ?? 0) > 0) return false;
  if ((payload.questionsUpdate?.length ?? 0) > 0) return false;
  return true;
}

/**
 * Payload lưu section — mỗi thao tác map REST theo id:
 * DELETE /questions/:questionId, PATCH /sections/:sectionId/source-url,
 * PUT /sections/:sectionId, PUT /questions/:questionId, PUT /choices/:choiceId,
 * POST /questions/:questionId/choices, DELETE /choices/:choiceId,
 * POST /sections/:sectionId/questions, POST /courses/:courseId/paths/:pathId/sections.
 */
function applyUploadedReadingSourceUrl(normalized, uploadedReadingSourceUrl) {
  if (!uploadedReadingSourceUrl || normalized.SkillType !== TEST_SKILL_READING) {
    return normalized;
  }

  return {
    ...normalized,
    MaterialUrl: uploadedReadingSourceUrl,
    ReadingSourceType: READING_SOURCE_UPLOAD,
  };
}

/** Cần upload HTML bài đọc (soạn thảo) khi xác nhận lưu. */
export function shouldUploadReadingComposeText(section, sourceBaselines = {}) {
  if (section?.SkillType !== TEST_SKILL_READING) return false;
  if (typeof File !== 'undefined' && section.File instanceof File) return false;
  if (!isSectionSourceDirty(section, sourceBaselines)) return false;

  const normalized = normalizeQuestionBankSectionForSave(section);
  return Boolean(String(normalized.Description ?? '').trim());
}

/** Build payload đầy đủ để gọi saveQuestionBankSection (insert/update/delete). */
export function buildQuestionBankSectionSavePayload(
  section,
  {
    courseId,
    pathId,
    questionPathId = null,
    sectionOrder,
  },
  baselines = {},
  sourceBaselines = {},
  options = {},
) {
  const { uploadedReadingSourceUrl = null } = options;
  let { normalized, sectionPayload } = buildSectionPayloadForPreview(section, sectionOrder);

  if (uploadedReadingSourceUrl) {
    normalized = applyUploadedReadingSourceUrl(normalized, uploadedReadingSourceUrl);
    sectionPayload = {
      ...sectionPayload,
      MaterialUrl: uploadedReadingSourceUrl,
      ReadingSourceType: READING_SOURCE_UPLOAD,
    };
  }
  const sectionId = normalized.SectionId ?? null;
  const currentQuestions = getFilledTestQuestions(normalized.Questions);
  const initialQuestions = normalized.InitialQuestions ?? [];

  const context = {
    courseId: Number(courseId) || null,
    pathId: Number(pathId) || null,
    questionPathId: questionPathId ?? null,
    sectionOrder: Number(sectionOrder) || 1,
    sectionId,
    sectionTempId: normalized.tempId ?? null,
    skillType: normalized.SkillType ?? null,
  };

  const payload = {
    context,
    summary: {
      sectionInsert: 0,
      sectionUpdate: 0,
      sectionSourceUpdate: 0,
      questionsInsert: 0,
      questionsUpdate: 0,
      questionsDelete: 0,
      choicesInsert: 0,
      choicesUpdate: 0,
      choicesDelete: 0,
    },
    sectionInsert: null,
    sectionUpdate: null,
    sectionSourceUpdate: null,
    questionsInsert: [],
    questionsUpdate: [],
    questionsDelete: [],
  };

  if (!sectionId) {
    payload.sectionInsert = {
      table: 'Question_Sections',
      data: {
        ...buildSectionApiData(normalized, sectionPayload),
        Order: context.sectionOrder,
      },
      questions: currentQuestions.map((question, index) => ({
        table: 'Questions',
        clientRef: question.tempId,
        Order: index + 1,
        data: buildQuestionApiData(question),
        choicesInsert: buildChoiceInsertRows(question),
      })),
    };
    payload.summary.sectionInsert = 1;
    payload.summary.questionsInsert = currentQuestions.length;
    return payload;
  }

  const sectionUpdateSet = buildSectionUpdateSet(
    sectionPayload,
    baselines,
    sourceBaselines,
    normalized.tempId,
  );
  if (Object.keys(sectionUpdateSet).length > 0) {
    payload.sectionUpdate = {
      table: 'Question_Sections',
      sectionId,
      set: sectionUpdateSet,
    };
    payload.summary.sectionUpdate = 1;
  }

  const sectionSourceUpdate = uploadedReadingSourceUrl && sectionId
    ? {
        table: 'Question_Sections',
        sectionId,
        SourceUrl: uploadedReadingSourceUrl,
      }
    : buildSectionSourceUpdate(
        normalized,
        baselines,
        sourceBaselines,
        normalized.tempId,
        sectionId,
      );
  if (sectionSourceUpdate) {
    payload.sectionSourceUpdate = sectionSourceUpdate;
    payload.summary.sectionSourceUpdate = 1;
  }

  currentQuestions.forEach((question, index) => {
    if (!question.QuestionId) {
      payload.questionsInsert.push({
        table: 'Questions',
        sectionId,
        clientRef: question.tempId,
        Order: index + 1,
        data: buildQuestionApiData(question),
        choicesInsert: buildChoiceInsertRows(question),
      });
      return;
    }

    const initial = initialQuestions.find((item) => item.tempId === question.tempId);
    if (!initial) {
      payload.questionsInsert.push({
        table: 'Questions',
        sectionId,
        clientRef: question.tempId,
        Order: index + 1,
        data: buildQuestionApiData(question),
        choicesInsert: buildChoiceInsertRows(question),
      });
      return;
    }

    const { set, choicesInsert, choicesUpdate, choicesDelete } = buildQuestionUpdatePatch(question, initial);
    const hasQuestionFieldChanges = Object.keys(set).length > 0;
    const hasChoiceChanges =
      choicesInsert.length > 0 || choicesUpdate.length > 0 || choicesDelete.length > 0;
    const initialIndex = initialQuestions.findIndex((item) => item.tempId === question.tempId);
    const initialOrder = initialIndex >= 0 ? initialIndex + 1 : index + 1;
    const orderChanged = (index + 1) !== initialOrder;

    if (!hasQuestionFieldChanges && !hasChoiceChanges && !orderChanged) {
      return;
    }

    payload.questionsUpdate.push({
      table: 'Questions',
      questionId: question.QuestionId,
      sectionId,
      ...(orderChanged ? { Order: index + 1 } : {}),
      ...(hasQuestionFieldChanges ? { set } : {}),
      ...(choicesInsert.length > 0 ? { choicesInsert } : {}),
      ...(choicesUpdate.length > 0 ? { choicesUpdate } : {}),
      ...(choicesDelete.length > 0 ? { choicesDelete } : {}),
    });
  });

  payload.questionsDelete = buildQuestionsDeleteRows(
    sectionId,
    currentQuestions,
    initialQuestions,
    normalized.DeletedQuestions ?? [],
  );

  payload.summary.questionsInsert = payload.questionsInsert.length;
  payload.summary.questionsUpdate = payload.questionsUpdate.length;
  payload.summary.questionsDelete = payload.questionsDelete.length;
  payload.summary.choicesInsert = countChoiceInserts(payload.questionsUpdate, payload.questionsInsert);
  payload.summary.choicesUpdate = countChoiceUpdates(payload.questionsUpdate);
  payload.summary.choicesDelete = countChoiceDeletes(payload.questionsUpdate);

  return payload;
}
