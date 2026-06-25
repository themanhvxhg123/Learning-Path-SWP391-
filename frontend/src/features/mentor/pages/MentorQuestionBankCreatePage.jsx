/**
 * MentorQuestionBankCreatePage
 * Route: /mentor/question-banks/create?courseId=1[&chapterId=2]
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import Loading from '@/shared/ui/Loading';
import ScrollToTopButton from '@/shared/ui/ScrollToTopButton';
import MentorQuestionBankBuilderPanel from '@/features/mentor/components/questionBank/MentorQuestionBankBuilderPanel';
import MentorQuestionBankDetailHeader from '@/features/mentor/components/questionBank/MentorQuestionBankDetailHeader';
import MentorQuestionBankRightRail from '@/features/mentor/components/questionBank/MentorQuestionBankRightRail';
import MentorQuestionBankSkillNav from '@/features/mentor/components/questionBank/MentorQuestionBankSkillNav';
import useQuestionBankCreateBootstrap, {
  buildQuestionBankSectionsSnapshot,
  clearQuestionBankCreateDraft,
  writeQuestionBankCreateDraft,
} from '@/features/mentor/hooks/useQuestionBankCreateBootstrap';
import { useQuestionBankCreateLeaveGuard } from '@/features/mentor/hooks/useQuestionBankCreateLeaveGuard';
import MentorCourseLeaveDialog from '@/features/mentor/components/course/MentorCourseLeaveDialog';
import {
  SCORING_MODE_AUTO,
  countActiveQuestionsBySkill,
  createQuestionBankSection,
  getFilledQuestionCount,
  getNonEmptyQuestionBankSections,
  getQuestionBankSectionNameFallback,
  normalizeQuestionBankSectionForSave,
  getSectionBaiNumber,
  getSectionsBySkill,
  consolidateWritingSections,
  scrollToQuestionBankItem,
  supportsQuestionBankMultiSection,
  validateTestMaterial,
} from '@/features/mentor/utils/mentorTestContentUtils';
import { PRIMARY } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { HEADER_HEIGHT } from '@/shared/layout/MainLayout';
import { createQuestionBank } from '@/features/mentor/services/questionBankService';

function validateForm(chapterId, pathsCount = 0) {
  const errors = {};
  if (pathsCount === 0) {
    errors.chapterId = 'Khóa học chưa có chương';
  } else if (!chapterId) {
    errors.chapterId = 'Vui lòng chọn chương từ mục lục bên phải';
  }
  return errors;
}

export default function MentorQuestionBankCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errors, setErrors] = useState({});
  const [baselineSnapshot, setBaselineSnapshot] = useState('');

  const {
    courseId,
    chapterId,
    course,
    coursePaths,
    loading,
    workspaceKey,
    editorReadyKey,
    sections,
    setSections,
    sectionErrors,
    setSectionErrors,
    activeSkill,
    setActiveSkill,
    activeSectionId,
    setActiveSectionId,
    selectedPath,
    hasPaths,
    canUseGenerator,
    selectChapter,
  } = useQuestionBankCreateBootstrap();

  const coursePublished = course?.IsPublished === true || course?.IsPublished === 1;
  const bankTitle = selectedPath?.PathName?.trim() ?? '';

  const courseCategory = useMemo(
    () => [course?.CategoryDisplayName, course?.LevelDisplayName].filter(Boolean).join(' · '),
    [course],
  );

  const questionCount = useMemo(() => getFilledQuestionCount(sections), [sections]);
  const questionCountBySkill = useMemo(
    () => countActiveQuestionsBySkill(sections),
    [sections],
  );

  const syncedWorkspaceRef = useRef('');
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const isDirty = useMemo(
    () =>
      !loading &&
      Boolean(chapterId) &&
      buildQuestionBankSectionsSnapshot(sections) !== baselineSnapshot,
    [baselineSnapshot, chapterId, loading, sections],
  );

  useEffect(() => {
    if (loading) return;

    if (!chapterId) {
      syncedWorkspaceRef.current = '';
      return;
    }

    if (editorReadyKey !== workspaceKey) return;
    if (syncedWorkspaceRef.current === workspaceKey) return;

    syncedWorkspaceRef.current = workspaceKey;
    setBaselineSnapshot(buildQuestionBankSectionsSnapshot(sectionsRef.current));
  }, [chapterId, editorReadyKey, loading, workspaceKey]);

  const persistDraft = useCallback(async () => {
    if (!courseId || !chapterId) {
      toast.error('Vui lòng chọn chương trước khi lưu nháp.');
      return false;
    }
    const ok = writeQuestionBankCreateDraft(courseId, chapterId, sections);
    if (ok) {
      setBaselineSnapshot(buildQuestionBankSectionsSnapshot(sections));
    }
    return ok;
  }, [chapterId, courseId, sections]);

  const {
    dialogOpen: leaveDialogOpen,
    saving: leaveSaving,
    requestLeave,
    handleStay,
    handleDiscard,
    handleSaveDraft: handleLeaveSaveDraft,
  } = useQuestionBankCreateLeaveGuard({
    isDirty,
    onSaveDraft: persistDraft,
    workspaceKey,
  });

  const handleSaveDraftClick = async () => {
    setSavingDraft(true);
    try {
      const ok = await persistDraft();
      if (ok) toast.success('Đã lưu bản nháp.');
    } finally {
      setSavingDraft(false);
    }
  };

  const skillSections = useMemo(
    () => getSectionsBySkill(sections, activeSkill),
    [sections, activeSkill],
  );

  const activeSection = useMemo(() => {
    if (activeSectionId) {
      const found = sections.find((section) => section.tempId === activeSectionId);
      if (found?.SkillType === activeSkill) return found;
    }
    return skillSections[0] ?? null;
  }, [sections, activeSkill, activeSectionId, skillSections]);

  const activeSectionIndex = useMemo(() => {
    if (!activeSection) return 0;
    return getSectionBaiNumber(activeSection, sections) - 1;
  }, [activeSection, sections]);

  const canDeleteActiveSection =
    supportsQuestionBankMultiSection(activeSkill) && skillSections.length > 1;

  useEffect(() => {
    if (!activeSection && skillSections[0]) {
      setActiveSectionId(skillSections[0].tempId);
    }
  }, [activeSection, skillSections, setActiveSectionId]);

  const mapSectionsForSave = (sourceSections) =>
    sourceSections.map((section) =>
      normalizeQuestionBankSectionForSave({
        ...section,
        DisplayName:
          String(section.DisplayName ?? '').trim() ||
          getQuestionBankSectionNameFallback(section, sourceSections),
      }),
    );

  const handleChapterSelect = (nextChapterId) => {
    if (String(nextChapterId) === String(chapterId)) return;
    if (errors.chapterId) setErrors((prev) => ({ ...prev, chapterId: undefined }));

    requestLeave({
      kind: 'chapter',
      chapterId: nextChapterId,
      onConfirm: (id) => {
        selectChapter(id);
      },
    });
  };

  const handleSectionChange = (tempId, nextSection) => {
    setSections((prev) => prev.map((s) => (s.tempId === tempId ? nextSection : s)));
    if (sectionErrors[tempId]) {
      setSectionErrors((prev) => ({ ...prev, [tempId]: {} }));
    }
  };

  const handleDeleteSection = (tempId) => {
    const section = sections.find((item) => item.tempId === tempId);
    if (!section || !supportsQuestionBankMultiSection(section.SkillType)) return;

    const sameSkillSections = getSectionsBySkill(sections, section.SkillType);
    if (sameSkillSections.length <= 1) return;

    const nextSections = sections.filter((item) => item.tempId !== tempId);
    setSections(nextSections);
    setSectionErrors((prev) => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });

    if (activeSectionId === tempId) {
      const fallback = getSectionsBySkill(nextSections, section.SkillType)[0];
      setActiveSectionId(fallback?.tempId ?? '');
    }
  };

  const handleSkillSelect = (skill) => {
    setActiveSkill(skill);
    const existing = getSectionsBySkill(sections, skill);
    if (existing[0]) {
      setActiveSectionId(existing[0].tempId);
      return;
    }

    const newSection = createQuestionBankSection(skill);
    setSections((prev) => [...prev, newSection]);
    setActiveSectionId(newSection.tempId);
  };

  const handleSectionSelect = (tempId) => {
    if (!tempId) return;
    const section = sections.find((item) => item.tempId === tempId);
    if (!section) return;
    setActiveSkill(section.SkillType);
    setActiveSectionId(tempId);
  };

  const handleAddBai = () => {
    if (!supportsQuestionBankMultiSection(activeSkill)) return;
    const newSection = createQuestionBankSection(activeSkill);
    setSections((prev) => [...prev, newSection]);
    setActiveSectionId(newSection.tempId);
  };

  const handleOutlineNavigate = (target) => {
    if (target.sectionTempId) {
      const section = sections.find((item) => item.tempId === target.sectionTempId);
      if (section) {
        setActiveSkill(section.SkillType);
        setActiveSectionId(target.sectionTempId);
      }
    } else if (target.skill) {
      handleSkillSelect(target.skill);
    }
    scrollToQuestionBankItem(target);
  };

  const validateSections = () => {
    if (!canUseGenerator) {
      return {
        _context: hasPaths
          ? 'Chọn chương từ mục lục bên phải trước khi tạo câu hỏi'
          : 'Khóa học chưa có chương để tạo bộ câu hỏi',
      };
    }

    const materialErrors = validateTestMaterial(
      { Title: bankTitle, Sections: sections, ScoringMode: SCORING_MODE_AUTO },
      { inlineSections: true, skipTitle: true },
    );
    if (materialErrors.Sections) {
      return { sections: materialErrors.Sections, _sections: materialErrors._sections };
    }
    if (materialErrors._sections) {
      return { _sections: materialErrors._sections };
    }
    return {};
  };

  const handleSubmit = async () => {
    const formErrors = validateForm(chapterId, coursePaths.length);
    const sectionValidation = validateSections();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    if (!bankTitle) {
      toast.error('Không tìm thấy tên chương.');
      return;
    }

    if (sectionValidation._context || sectionValidation._sections) {
      if (sectionValidation.sections) setSectionErrors(sectionValidation.sections);
      toast.error(
        sectionValidation._context ?? sectionValidation._sections ?? 'Vui lòng thêm câu hỏi.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const sectionsPayload = mapSectionsForSave(
        getNonEmptyQuestionBankSections(consolidateWritingSections(sections)),
      );

      const res = await createQuestionBank({
        title: bankTitle,
        courseId: Number(courseId),
        courseTitle: course?.CourseName ?? '',
        chapterId: Number(chapterId),
        chapterTitle: bankTitle,
        sections: sectionsPayload,
      });

      if (!res.ok) {
        toast.error(res.message ?? 'Tạo ngân hàng câu hỏi thất bại.');
        return;
      }

      clearQuestionBankCreateDraft(courseId, chapterId);
      toast.success('Tạo ngân hàng câu hỏi thành công!');
      navigate(
        `/mentor/question-banks/${res.bank.BankId ?? res.bank.id}?courseId=${courseId}&chapterId=${chapterId}`,
      );
    } catch {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const footerActions = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%' }}>
      <AppButton
        variant="outlined"
        loading={savingDraft}
        disabled={!chapterId || submitting || leaveSaving}
        onClick={handleSaveDraftClick}
        fullWidth
        sx={{
          height: 44,
          fontSize: 14,
          fontWeight: 700,
          borderRadius: '999px',
        }}
      >
        Lưu nháp
      </AppButton>
      <AppButton
        loading={submitting}
        startIcon={<SaveOutlinedIcon />}
        onClick={handleSubmit}
        disabled={savingDraft || leaveSaving}
        fullWidth
        sx={{
          height: 44,
          fontSize: 14,
          fontWeight: 700,
          borderRadius: '999px',
          bgcolor: PRIMARY,
          color: '#fff',
          boxShadow: 'none',
          '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
        }}
      >
        Lưu ngân hàng
      </AppButton>
    </Box>
  );

  const handleBack = () => {
    const destination = courseId
      ? `/mentor/courses/${courseId}/questions`
      : '/mentor/question-banks';
    requestLeave({ kind: 'navigate', to: destination });
  };

  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <Loading message="Đang tải dữ liệu khóa học..." />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', lg: 1520 }, mx: 'auto' }}>
      <MentorQuestionBankDetailHeader
        isCreateMode
        bankTitle={bankTitle}
        courseId={courseId}
        course={course}
        courseName={course?.CourseName ?? ''}
        courseCategory={courseCategory}
        chapterTitle={selectedPath?.PathName}
        coursePublished={coursePublished}
        totalQuestionCount={questionCount}
        questionCountBySkill={questionCountBySkill}
        actions={footerActions}
        onBack={handleBack}
      />

      <Box
        key={workspaceKey}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, lg: 2.5 },
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', lg: 200 },
            flexShrink: 0,
            alignSelf: 'flex-start',
            position: { lg: 'sticky' },
            top: { lg: HEADER_HEIGHT + 16 },
            zIndex: 2,
          }}
        >
          <MentorQuestionBankSkillNav
            sections={sections}
            activeSkill={activeSkill}
            disabled={!canUseGenerator}
            sectionErrors={sectionErrors}
            onSkillChange={handleSkillSelect}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            maxWidth: { lg: 1280 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(280px, 3fr)' },
            gap: { xs: 2, lg: 2.5 },
            alignItems: 'start',
          }}
        >
          <MentorQuestionBankBuilderPanel
            sections={sections}
            activeSkill={activeSkill}
            activeSection={activeSection}
            activeSectionIndex={activeSectionIndex}
            skillSections={skillSections}
            sectionErrors={sectionErrors}
            questionCount={questionCount}
            disabled={!canUseGenerator}
            emptyHint={
              !canUseGenerator
                ? hasPaths
                  ? 'Chọn chương từ mục lục khóa học ở cột bên phải để bắt đầu tạo bộ câu hỏi.'
                  : 'Khóa học chưa có chương để tạo bộ câu hỏi.'
                : null
            }
            canDeleteActiveSection={canDeleteActiveSection}
            onSectionSelect={handleSectionSelect}
            onAddBai={handleAddBai}
            onSectionChange={handleSectionChange}
            onDeleteSection={handleDeleteSection}
          />

          <MentorQuestionBankRightRail
            sections={sections}
            activeSkill={activeSkill}
            activeSectionId={activeSectionId}
            onNavigateToItem={handleOutlineNavigate}
            courseName={course?.CourseName ?? ''}
            courseCategory={courseCategory}
            chapterTitle={selectedPath?.PathName}
            coursePaths={coursePaths}
            pathsLoading={false}
            selectedPathId={chapterId}
            chapterError={errors.chapterId}
            courseId={courseId}
            courseOutlineHint="Chọn chương để tạo hoặc mở ngân hàng câu hỏi tương ứng."
            onPathSelect={handleChapterSelect}
          />
        </Box>
      </Box>

      <Box id="qb-mobile-footer-actions" sx={{ display: { xs: 'flex', lg: 'none' }, mt: 2.5, pb: 4 }}>
        {footerActions}
      </Box>

      <ScrollToTopButton avoidSelectors={['#app-site-footer', '#qb-mobile-footer-actions']} />

      <MentorCourseLeaveDialog
        open={leaveDialogOpen}
        onStay={handleStay}
        onDiscard={handleDiscard}
        onSaveDraft={handleLeaveSaveDraft}
        saving={leaveSaving}
      />
    </Box>
  );
}
