import {
  TEST_SKILL_VOCABULARY,
  normalizeQuestionBankSectionForSave,
  validateQuestionBankSection,
  getQuestionBankSectionValidationToast,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  isSkillSectionRandomPick,
  validateListeningReadingPublishedSectionQuota,
  validateVocabularySectionQuestionQuota,
} from '@/features/mentor/utils/mentorChapterQuizConfigUtils';

/**
 * Lớp validate frontend khi mentor bấm lưu section.
 * Chỉ khi `ok: true` mới được gọi API `saveQuestionBankSection`.
 *
 * @param {object} params
 * @param {object} params.section — section đang active (state editor)
 * @param {object[]} [params.allSections]
 * @param {object|null} [params.chapterQuizConfig]
 * @param {boolean} [params.deleteQuestionsOnly] — chỉ xóa câu hỏi, bỏ qua validate nội dung
 * @returns {{ ok: true } | { ok: false, errors: object, toastMessage: string }}
 */
export function validateQuestionBankSectionBeforeBackendSave({
  section,
  allSections = [],
  chapterQuizConfig = null,
  deleteQuestionsOnly = false,
}) {
  if (!section?.tempId) {
    const message = 'Section không hợp lệ';
    return { ok: false, errors: { _section: message }, toastMessage: message };
  }

  if (deleteQuestionsOnly) {
    return { ok: true };
  }

  const normalized = normalizeQuestionBankSectionForSave(section);
  const errors = validateQuestionBankSection(normalized, {
    forSave: true,
    allSections,
  });

  if (isSkillSectionRandomPick(section.SkillType)) {
    Object.assign(
      errors,
      validateListeningReadingPublishedSectionQuota(
        allSections,
        section.SkillType,
        chapterQuizConfig,
      ),
    );
  }

  if (section.SkillType === TEST_SKILL_VOCABULARY) {
    Object.assign(
      errors,
      validateVocabularySectionQuestionQuota(section, chapterQuizConfig),
    );
  }

  if (Object.keys(errors).length === 0) {
    return { ok: true };
  }

  const toastMessage =
    errors.isUseForTest
    ?? errors._questions
    ?? getQuestionBankSectionValidationToast(errors, section)
    ?? 'Vui lòng kiểm tra lại thông tin section.';

  return { ok: false, errors, toastMessage };
}
