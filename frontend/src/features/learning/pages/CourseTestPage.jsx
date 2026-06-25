import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link as MuiLink,
  Typography,
} from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import EmptyState from '@/shared/ui/EmptyState';
import TestIntroPanel from '@/features/learning/components/test/TestIntroPanel';
import TestHeader from '@/features/learning/components/test/TestHeader';
import TestSkillNav, { SKILL_SHORT_LABELS } from '@/features/learning/components/test/TestSkillNav';
import {
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LISTENING,
} from '@/features/mentor/utils/mentorTestContentUtils';
import TestSkillSection from '@/features/learning/components/test/TestSkillSection';
import TestSectionToolbar from '@/features/learning/components/test/TestSectionToolbar';
import {
  getTestMeta,
  startTestAttempt,
  submitTestAttempt,
} from '@/features/learning/services/courseTestService';
import TestResultPanel from '@/features/learning/components/test/TestResultPanel';
import { flattenPaperQuestions, getSectionQuestionGroups } from '@/features/learning/utils/courseTestPaperUtils';
import { TEST_LEAVE_DIALOG, useTestLeaveGuard } from '@/features/learning/hooks/useTestLeaveGuard';
import { TEST_MUTED, TEST_TEXT } from '@/features/learning/components/test/testTheme';

const PAGE_STATE = {
  LOADING: 'loading',
  INTRO: 'intro',
  IN_PROGRESS: 'in_progress',
  SUBMITTING: 'submitting',
  RESULT: 'result',
  ERROR: 'error',
};

export default function CourseTestPage() {
  const { courseId, scope, chapterId } = useParams();
  const navigate = useNavigate();
  const learnPath = `/my-courses/${courseId}/learn`;

  const [pageState, setPageState] = useState(PAGE_STATE.LOADING);
  const [meta, setMeta] = useState(null);
  const [paper, setPaper] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activeSkillType, setActiveSkillType] = useState(TEST_SKILL_LISTENING);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  const autoSubmittedRef = useRef(false);
  const submitInFlightRef = useRef(false);

  const normalizedScope = scope === 'final' ? 'final' : 'chapter';
  const resolvedChapterId = normalizedScope === 'final' ? null : chapterId;

  const allQuestions = useMemo(
    () => flattenPaperQuestions(paper),
    [paper],
  );

  const answeredCount = useMemo(
    () => allQuestions.filter((question) => (answers[question.tempId] ?? []).length > 0).length,
    [allQuestions, answers],
  );

  const unansweredCount = allQuestions.length - answeredCount;

  const activeSection = useMemo(
    () => (paper?.sections ?? []).find((section) => section.skillType === activeSkillType) ?? null,
    [paper, activeSkillType],
  );

  const activeSectionColors = TEST_SKILL_CHIP_COLORS[activeSkillType]
    ?? TEST_SKILL_CHIP_COLORS[TEST_SKILL_LISTENING];

  const questionGroups = useMemo(
    () => getSectionQuestionGroups(activeSection),
    [activeSection],
  );

  const activeGroup = questionGroups[activeGroupIndex] ?? null;
  const canGoGroupBack = activeGroupIndex > 0;
  const canGoGroupNext = activeGroupIndex < questionGroups.length - 1;

  useEffect(() => {
    setActiveGroupIndex(0);
  }, [activeSkillType]);

  const isTestActive =
    pageState === PAGE_STATE.IN_PROGRESS || pageState === PAGE_STATE.SUBMITTING;

  const {
    dialogOpen: leaveDialogOpen,
    confirmLeave,
    cancelLeave,
    allowLeave,
  } = useTestLeaveGuard(isTestActive);

  const loadMeta = useCallback(async () => {
    setPageState(PAGE_STATE.LOADING);
    setErrorMessage('');

    const res = await getTestMeta(courseId, normalizedScope, resolvedChapterId, {
      chapterTitle: resolvedChapterId ? `Chương #${resolvedChapterId}` : null,
    });

    if (!res.ok) {
      setErrorMessage(res.message ?? 'Không tải được thông tin bài kiểm tra.');
      setPageState(PAGE_STATE.ERROR);
      return;
    }

    setMeta(res.meta);
    setPageState(PAGE_STATE.INTRO);
  }, [courseId, normalizedScope, resolvedChapterId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const handleAnswerChange = useCallback((questionTempId, selectedOptionTempIds) => {
    setAnswers((prev) => ({
      ...prev,
      [questionTempId]: selectedOptionTempIds,
    }));
  }, []);

  const handleSubmit = useCallback(async (options = {}) => {
    if (!attempt?.attemptId || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setPageState(PAGE_STATE.SUBMITTING);
    setConfirmSubmitOpen(false);

    const res = await submitTestAttempt(attempt.attemptId, answers, options);

    submitInFlightRef.current = false;

    if (!res.ok) {
      setErrorMessage(res.message ?? 'Nộp bài thất bại.');
      setPageState(PAGE_STATE.IN_PROGRESS);
      return;
    }

    setMeta(res.meta);
    setAttempt(res.attempt);
    setResult(res.result);
    allowLeave();
    setPageState(PAGE_STATE.RESULT);
  }, [attempt, answers, allowLeave]);

  useEffect(() => {
    if (pageState !== PAGE_STATE.IN_PROGRESS || !attempt?.attemptId) return undefined;

    autoSubmittedRef.current = false;

    const tick = () => {
      const expiresAt = new Date(attempt.expiresAt).getTime();
      const nextRemaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        handleSubmit({ autoExpired: true });
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [pageState, attempt, handleSubmit]);

  const handleStart = async () => {
    setStarting(true);
    setErrorMessage('');

    const res = await startTestAttempt(courseId, normalizedScope, resolvedChapterId, {
      chapterTitle: meta?.chapterTitle ?? (resolvedChapterId ? `Chương #${resolvedChapterId}` : null),
    });

    setStarting(false);

    if (!res.ok) {
      setErrorMessage(res.message ?? 'Không thể bắt đầu bài kiểm tra.');
      return;
    }

    setMeta(res.meta);
    setPaper(res.paper);
    setAttempt(res.attempt);
    setAnswers({});
    setResult(null);
    setActiveSkillType(res.paper?.sections?.[0]?.skillType ?? TEST_SKILL_LISTENING);
    setActiveGroupIndex(0);
    setRemainingSeconds(res.attempt.remainingSeconds ?? res.meta.timeLimitMinutes * 60);
    setTotalSeconds((res.meta.timeLimitMinutes ?? res.attempt.timeLimitMinutes ?? 15) * 60);
    setPageState(PAGE_STATE.IN_PROGRESS);
  };

  const handleRetry = async () => {
    setPaper(null);
    setAttempt(null);
    setAnswers({});
    setResult(null);
    await loadMeta();
  };

  const handleBackToLearn = () => {
    navigate(learnPath);
  };

  const breadcrumbTitle =
    normalizedScope === 'final' ? 'Bài kiểm tra toàn khóa' : 'Bài kiểm tra chương';

  const hideBreadcrumb =
    pageState === PAGE_STATE.IN_PROGRESS || pageState === PAGE_STATE.SUBMITTING;

  if (pageState === PAGE_STATE.LOADING) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto', py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (pageState === PAGE_STATE.ERROR) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <EmptyState
          title="Không tải được bài kiểm tra"
          description={errorMessage || 'Vui lòng thử lại sau.'}
          action={
            <AppButton variant="outlined" onClick={handleBackToLearn}>
              Quay lại học
            </AppButton>
          }
        />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: pageState === PAGE_STATE.IN_PROGRESS || pageState === PAGE_STATE.SUBMITTING ? 1180 : 960, mx: 'auto', pb: 6 }}>
      {!hideBreadcrumb && (
        <Breadcrumbs
          separator="/"
          sx={{ mb: 2.5, '& .MuiBreadcrumbs-separator': { color: TEST_MUTED, mx: 0.5 } }}
        >
          <MuiLink
            component={Link}
            to="/my-courses"
            underline="hover"
            sx={{ fontSize: 13, color: TEST_MUTED, fontWeight: 500 }}
          >
            Khóa học của tôi
          </MuiLink>
          <MuiLink
            component={Link}
            to={learnPath}
            underline="hover"
            sx={{ fontSize: 13, color: TEST_MUTED, fontWeight: 500 }}
          >
            Học bài
          </MuiLink>
          <Typography sx={{ fontSize: 13, color: TEST_TEXT, fontWeight: 600 }}>
            {breadcrumbTitle}
          </Typography>
        </Breadcrumbs>
      )}

      {errorMessage && pageState === PAGE_STATE.INTRO && (
        <Typography sx={{ fontSize: 14, color: '#DC2626', fontWeight: 600, mb: 2 }}>
          {errorMessage}
        </Typography>
      )}

      {pageState === PAGE_STATE.INTRO && (
        <TestIntroPanel
          meta={meta}
          loading={starting}
          onStart={handleStart}
          onBack={handleBackToLearn}
        />
      )}

      {(pageState === PAGE_STATE.IN_PROGRESS || pageState === PAGE_STATE.SUBMITTING) && paper && (
        <>
          <TestHeader
            meta={meta}
            answeredCount={answeredCount}
            totalQuestions={allQuestions.length}
            remainingSeconds={remainingSeconds}
            totalSeconds={totalSeconds}
            onSubmit={() => setConfirmSubmitOpen(true)}
            submitting={pageState === PAGE_STATE.SUBMITTING}
          />

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { md: 'flex-start' },
              gap: 2.5,
            }}
          >
            <TestSkillNav
              sections={paper.sections ?? []}
              activeSkillType={activeSkillType}
              answers={answers}
              onSelect={setActiveSkillType}
            />

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {activeSection && activeGroup && (
                <>
                  <TestSectionToolbar
                    title={SKILL_SHORT_LABELS[activeSection.skillType] ?? activeSection.displayName}
                    groupLabel={
                      questionGroups.length > 1
                        ? `Nhóm ${activeGroupIndex + 1}/${questionGroups.length}: ${activeGroup.displayName}`
                        : activeGroup.displayName
                    }
                    groupMeta={`${activeGroup.questions?.length ?? 0} câu`}
                    accentColor={activeSectionColors.color}
                    accentBg={activeSectionColors.bg}
                    canGoBack={canGoGroupBack}
                    canGoNext={canGoGroupNext}
                    onBack={() => setActiveGroupIndex((prev) => Math.max(0, prev - 1))}
                    onNext={() =>
                      setActiveGroupIndex((prev) =>
                        Math.min(questionGroups.length - 1, prev + 1),
                      )
                    }
                  />

                  <TestSkillSection
                    section={activeSection}
                    answers={answers}
                    onAnswerChange={handleAnswerChange}
                    hideHeader
                    activeGroup={activeGroup}
                  />
                </>
              )}
            </Box>
          </Box>
        </>
      )}

      {pageState === PAGE_STATE.RESULT && result && (
        <TestResultPanel
          meta={meta}
          result={result}
          onRetry={handleRetry}
          onBack={handleBackToLearn}
        />
      )}

      <ConfirmDialog
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={() => handleSubmit()}
        title="Nộp bài kiểm tra?"
        message={
          unansweredCount > 0
            ? `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`
            : 'Bạn đã trả lời đủ câu hỏi. Xác nhận nộp bài?'
        }
        confirmLabel="Nộp bài"
        cancelLabel="Tiếp tục làm"
        loading={pageState === PAGE_STATE.SUBMITTING}
      />

      <ConfirmDialog
        open={leaveDialogOpen}
        onClose={cancelLeave}
        onConfirm={confirmLeave}
        title={TEST_LEAVE_DIALOG.title}
        message={TEST_LEAVE_DIALOG.message}
        confirmLabel={TEST_LEAVE_DIALOG.confirmLabel}
        cancelLabel={TEST_LEAVE_DIALOG.cancelLabel}
        destructive
      />
    </Box>
  );
}
