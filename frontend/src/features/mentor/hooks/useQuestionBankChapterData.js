/**
 * useQuestionBankChapterData — UI-only: khởi tạo section mặc định, không gọi API.
 */
import { useCallback, useEffect, useState } from 'react';
import { createQuestionBankSkillSections } from '@/features/mentor/utils/mentorTestContentUtils';

export default function useQuestionBankChapterData({
  courseId,
  chapterId,
  setSections,
  setActiveSkill,
  setActiveSectionId,
}) {
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [questionsLoading] = useState(false);

  useEffect(() => {
    if (!courseId || !chapterId) {
      setSections?.(createQuestionBankSkillSections());
      return;
    }

    setSectionsLoading(true);
    setSections?.(createQuestionBankSkillSections());
    setActiveSkill?.('LISTENING');
    setActiveSectionId?.('');
    setSectionsLoading(false);
  }, [courseId, chapterId, setSections, setActiveSkill, setActiveSectionId]);

  const loadSectionQuestions = useCallback(
    async (sectionTempId, currentSections = []) =>
      currentSections.find((item) => item.tempId === sectionTempId) ?? null,
    [],
  );

  return {
    sectionsLoading,
    questionsLoading,
    loadSectionQuestions,
  };
}
