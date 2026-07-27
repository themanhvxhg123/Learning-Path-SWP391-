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
import TestSectionNav from '@/features/learning/components/test/TestSectionNav';
import {
  getTestMeta,
  startTestAttempt,
  submitTestAttempt,
} from '@/features/learning/services/courseTestService';
import TestResultPanel from '@/features/learning/components/test/TestResultPanel';
import {
  flattenPaperQuestions,
  getSectionQuestionGroups,
  normalizeTestPaper,
} from '@/features/learning/utils/courseTestPaperUtils';
import { buildTestGroupToolbarMeta } from '@/features/learning/utils/testSectionContextUtils';
import { buildPaperSectionsPayload } from '@/features/learning/utils/testAttemptSectionStatsPayload';
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

/**
 * Component chính quản lý giao diện làm bài kiểm tra (bao gồm bài kiểm tra chương và cuối khóa).
 * Thực hiện quản lý toàn bộ luồng từ lúc hiển thị giới thiệu, đếm ngược làm bài, cho đến khi nộp bài và xem kết quả.
 */
export default function CourseTestPage() {
  const { courseId, scope, chapterId } = useParams();
  const navigate = useNavigate();
  const learnPath = `/my-courses/${courseId}/learn`;

  // --- 1. QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT) ---
  // Dùng FSM (Finite State Machine) để quản lý tiến trình: loading -> intro -> in_progress -> result
  const [pageState, setPageState] = useState(PAGE_STATE.LOADING);
  const [meta, setMeta] = useState(null);       // Lưu thông tin cấu hình đề thi (thời gian, tổng số câu...)
  const [paper, setPaper] = useState(null);     // Lưu dữ liệu thô của đề thi lấy từ Backend
  const [attempt, setAttempt] = useState(null); // Lưu "phiên làm bài" hiện tại (có ID riêng biệt để chống gian lận)
  const [result, setResult] = useState(null);   // Lưu bảng kết quả (điểm số, số câu đúng/sai) sau khi chấm bài
  
  // Lưu đáp án học viên đã tick chọn. Cấu trúc dạng Từ điển (Dictionary): { [ID Câu hỏi]: [Mảng ID đáp án được chọn] }
  const [answers, setAnswers] = useState({}); 
  const [remainingSeconds, setRemainingSeconds] = useState(0); // Bộ đếm ngược thời gian làm bài (giây)
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false); // Trạng thái Đóng/Mở của Popup xác nhận nộp bài
  const [starting, setStarting] = useState(false); 
  
  // Quản lý việc học viên đang đứng ở Tab kỹ năng nào (Ví dụ: Nghe, Đọc, Viết) và Nhóm câu hỏi nào
  const [activeSkillType, setActiveSkillType] = useState(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  
  // --- 2. SỬ DỤNG useRef ĐỂ CHỐNG SPAM (FLAGGING) ---
  const autoSubmittedRef = useRef(false);  // Cờ đánh dấu hệ thống đã Tự Động Nộp Bài (khi hết giờ) chưa?
  const submitInFlightRef = useRef(false); // Cờ chặn người dùng bấm nút Nộp bài 2 lần liên tiếp (Chống spam click)

  const normalizedScope = scope === 'final' ? 'final' : 'chapter';
  const resolvedChapterId = normalizedScope === 'final' ? null : chapterId;

  // --- 3. TỐI ƯU HIỆU NĂNG VỚI useMemo ---
  // Đề thi có thể rất nặng. useMemo giúp React "nhớ" lại kết quả tính toán. 
  // Chỉ khi nào biến `paper` thay đổi thì nó mới tính toán lại, giúp mượt mà các thao tác click khác.
  const displayPaper = useMemo(
    () => normalizeTestPaper(paper),
    [paper],
  );

  // Kỹ thuật Ép phẳng mảng: Từ cấu trúc dạng Cây nhiều nhánh (Đề thi -> Phần thi -> Nhóm -> Câu hỏi)
  // Ép thành 1 mảng 1 chiều duy nhất để tiện cho việc đếm tổng số câu hỏi và đối chiếu đáp án.
  const allQuestions = useMemo(
    () => flattenPaperQuestions(displayPaper),
    [displayPaper],
  );

  // Tự động tính toán số câu ĐÃ trả lời. Sẽ tự động chạy lại MỖI KHI `answers` (lựa chọn của học viên) thay đổi.
  const answeredCount = useMemo(
    () => allQuestions.filter((question) => (answers[question.tempId] ?? []).length > 0).length,
    [allQuestions, answers],
  );

  const unansweredCount = allQuestions.length - answeredCount;

  // Lấy ra phần thi (Section - ví dụ Listening hay Reading) đang được hiển thị trên màn hình hiện tại
  const activeSection = useMemo(
    () => (displayPaper?.sections ?? []).find((section) => section.skillType === activeSkillType) ?? null,
    [displayPaper, activeSkillType],
  );

  const activeSectionColors = TEST_SKILL_CHIP_COLORS[activeSkillType]
    ?? TEST_SKILL_CHIP_COLORS[meta?.skills?.[0]]
    ?? TEST_SKILL_CHIP_COLORS[displayPaper?.sections?.[0]?.skillType]
    ?? TEST_SKILL_CHIP_COLORS[TEST_SKILL_LISTENING];

  const questionGroups = useMemo(
    () => getSectionQuestionGroups(activeSection),
    [activeSection],
  );

  const activeGroup = questionGroups[activeGroupIndex] ?? null;

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

  /**
   * Tải thông tin chung (metadata) của bài kiểm tra (tiêu đề, thời gian làm bài, số câu...) từ server.
   */
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

  /**
   * Cập nhật danh sách câu trả lời của học viên khi họ chọn hoặc thay đổi phương án của một câu hỏi.
   */
  const handleAnswerChange = useCallback((questionTempId, selectedOptionTempIds) => {
    setAnswers((prev) => ({
      ...prev,
      [questionTempId]: selectedOptionTempIds,
    }));
  }, []);

  /**
   * --- 4. HÀM CHẤM ĐIỂM / NỘP BÀI (SUBMIT API) ---
   */
  const handleSubmit = useCallback(async (options = {}) => {
    // BẮT CỜ: Nếu chưa có phiên làm bài hoặc API Nộp bài ĐANG ĐƯỢC CHẠY DỞ DANG thì đứng im, không làm gì cả.
    if (!attempt?.attemptId || submitInFlightRef.current) return;

    submitInFlightRef.current = true;    // KHÓA CỔNG: Dựng cờ để chặn tuyệt đối các cú click "Nộp bài" tiếp theo (Chống Spam).
    setPageState(PAGE_STATE.SUBMITTING); // Đổi màn hình sang trạng thái đang quay vòng vòng (Loading submit).
    setConfirmSubmitOpen(false);         // Tắt luôn cái Popup xác nhận đi.

    const timeSpentSeconds = totalSeconds - remainingSeconds; // Công thức tính tổng thời gian đã tiêu tốn
    const paperSections = buildPaperSectionsPayload(displayPaper, resolvedChapterId);
    
    // Gọi lệnh gửi toàn bộ túi đáp án (answers) và thời gian thi lên Backend nhờ chấm dùm.
    const res = await submitTestAttempt(
      courseId,
      resolvedChapterId,
      attempt.attemptId,
      answers,
      timeSpentSeconds,
      allQuestions.length,
      {
        scope: normalizedScope,
        paperSections,
      },
    );

    submitInFlightRef.current = false; // MỞ CỔNG LẠI: Backend trả kết quả rồi, mở khóa chặn click.

    // XỬ LÝ LỖI: Lỡ rớt mạng hoặc Backend bị lỗi chấm điểm
    if (!res.ok) {
      setErrorMessage(res.message ?? 'Nộp bài thất bại.');
      setPageState(PAGE_STATE.IN_PROGRESS); // Mở lại giao diện thi để học viên nộp lại.
      return;
    }

    // Lấy bảng điểm lưu vào State và lật sang trang Hiển thị kết quả.
    setMeta(res.meta);
    setAttempt(res.attempt);
    setResult(res.result);
    allowLeave(); // Báo cho Hệ thống biết Học viên đã thi xong hợp lệ. Lúc này học viên tắt Tab thoải mái, không hiện bảng chửi nữa.
    setPageState(PAGE_STATE.RESULT);
  }, [attempt, answers, allowLeave, courseId, resolvedChapterId, displayPaper, normalizedScope, allQuestions.length, totalSeconds, remainingSeconds]);

  // --- 5. HIỆU ỨNG ĐỒNG HỒ ĐẾM NGƯỢC (TIMER EFFECT) ---
  // Nó sẽ chạy lặp đi lặp lại tự động mỗi khi giao diện chuyển sang trạng thái đang làm bài
  useEffect(() => {
    // Chỉ kích hoạt đồng hồ nếu đang ở chế độ làm bài và đã có ID phiên làm bài
    if (pageState !== PAGE_STATE.IN_PROGRESS || !attempt?.attemptId) return undefined;

    autoSubmittedRef.current = false; // Reset cờ nộp bài tự động khi vừa bắt đầu môn thi mới

    const tick = () => {
      // Logic rất an toàn: Thay vì tự đếm 10, 9, 8, 7. Nó so sánh thẳng với Ngày giờ kết thúc của Server.
      // Dù học viên có cố tình refresh trang web thì đồng hồ vẫn không bị reset lại từ đầu.
      const expiresAt = new Date(attempt.expiresAt).getTime();
      const nextRemaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      // KÍCH HOẠT NỘP BÀI TỰ ĐỘNG (KHI HẾT GIỜ)
      if (nextRemaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true; 
        handleSubmit({ autoExpired: true });
      }
    };

    tick(); // Phải gọi chạy tay 1 lần ngay lập tức, để tránh bị "đứng hình" 1 giây đầu tiên trên màn hình.
    const intervalId = window.setInterval(tick, 1000); // Lên lịch: Cứ 1000ms (1 giây) là tự động gọi hàm tick() một lần.
    
    // Cleanup function: Tự động chạy khi học viên làm bài xong hoặc rời khỏi trang web.
    // Lệnh này giúp dọn dẹp cái đồng hồ ngầm, tránh lỗi "Memory Leak" (Rò rỉ bộ nhớ) kinh điển trong React.
    return () => window.clearInterval(intervalId);
  }, [pageState, attempt, handleSubmit]);

  /**
   * Khởi tạo và bắt đầu lượt làm bài kiểm tra. Gọi API lấy đề thi, reset câu trả lời và bắt đầu đếm ngược thời gian.
   */
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
    const normalizedPaper = normalizeTestPaper(res.paper);
    setPaper(normalizedPaper);
    setAttempt(res.attempt);
    setAnswers({});
    setResult(null);
    const initialSkill = res.meta?.skills?.[0]
      ?? normalizedPaper?.sections?.[0]?.skillType
      ?? null;
    setActiveSkillType(initialSkill);
    setActiveGroupIndex(0);
    setRemainingSeconds(res.attempt.remainingSeconds ?? res.meta.timeLimitMinutes * 60);
    setTotalSeconds((res.meta.timeLimitMinutes ?? res.attempt.timeLimitMinutes ?? 15) * 60);
    setPageState(PAGE_STATE.IN_PROGRESS);
  };

  /**
   * Xóa sạch trạng thái bài làm cũ và gọi hàm tải lại thông tin bài kiểm tra để người dùng chuẩn bị làm lại từ đầu.
   */
  const handleRetry = async () => {
    setPaper(null);
    setAttempt(null);
    setAnswers({});
    setResult(null);
    await loadMeta();
  };

  /**
   * Điều hướng người dùng quay trở lại trang giao diện học tập của khóa học hiện tại.
   */
  const handleBackToLearn = () => {
    navigate(learnPath);
  };

  const breadcrumbTitle =
    normalizedScope === 'final' ? 'Bài kiểm tra toàn khóa' : 'Bài kiểm tra chương';

  const hideBreadcrumb =
    pageState === PAGE_STATE.IN_PROGRESS || pageState === PAGE_STATE.SUBMITTING;

  // 1. Giao diện tải dữ liệu (Loading Spinner)
  if (pageState === PAGE_STATE.LOADING) {
    return (
      <Box sx={{ maxWidth: 960, mx: 'auto', py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  // 2. Giao diện thông báo lỗi (khi không tải được bài kiểm tra)
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
      {/* Thanh điều hướng breadcrumbs (chỉ hiện khi chưa bắt đầu làm bài) */}
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

      {/* Thông báo lỗi khi khởi tạo lượt thi thất bại */}
      {errorMessage && pageState === PAGE_STATE.INTRO && (
        <Typography sx={{ fontSize: 14, color: '#DC2626', fontWeight: 600, mb: 2 }}>
          {errorMessage}
        </Typography>
      )}

      {/* Màn hình giới thiệu thông tin bài thi trước khi bắt đầu (tên bài, thời gian, số câu, điểm tối thiểu...) */}
      {pageState === PAGE_STATE.INTRO && (
        <>
          <TestIntroPanel
            meta={meta}
            loading={starting}
            onStart={handleStart}
            onBack={handleBackToLearn}
          />
        </>
      )}

      {/* Màn hình phòng thi (khi đang làm bài hoặc đang nộp bài) */}
      {(pageState === PAGE_STATE.IN_PROGRESS || pageState === PAGE_STATE.SUBMITTING) && displayPaper && (
        <>
          {/* Thanh tiêu đề thi chứa tên bài, đồng hồ đếm ngược và nút nộp bài */}
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
            {/* Thanh menu bên trái — Nghe / Đọc / Từ vựng–Ngữ pháp */}
            <TestSkillNav
              sections={displayPaper.sections ?? []}
              configuredSkillTypes={meta?.skills ?? []}
              activeSkillType={activeSkillType}
              answers={answers}
              onSelect={setActiveSkillType}
            />

            {/* Phần hiển thị câu hỏi của kỹ năng đang chọn */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {activeSection && activeGroup && (
                <>
                  {questionGroups.length > 1 && (
                    <TestSectionNav
                      groups={questionGroups}
                      activeIndex={activeGroupIndex}
                      answers={answers}
                      accentColor={activeSectionColors.color}
                      accentBg={activeSectionColors.bg}
                      onSelect={setActiveGroupIndex}
                    />
                  )}

                  <TestSectionToolbar
                    title={SKILL_SHORT_LABELS[activeSection.skillType] ?? activeSection.displayName}
                    groupLabel={activeGroup.displayName}
                    groupMeta={buildTestGroupToolbarMeta(activeSection.skillType, activeGroup)}
                    accentColor={activeSectionColors.color}
                    accentBg={activeSectionColors.bg}
                  />

                  {/* Danh sách các câu hỏi cụ thể và các phương án chọn lựa trắc nghiệm */}
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

      {/* Màn hình kết quả sau khi nộp bài thành công (hiển thị điểm, tỉ lệ đúng/sai, đáp án chi tiết) */}
      {pageState === PAGE_STATE.RESULT && result && (
        <TestResultPanel
          meta={meta}
          result={result}
          paper={displayPaper ?? paper}
          onRetry={handleRetry}
          onBack={handleBackToLearn}
        />
      )}

      {/* Hộp thoại Popup xác nhận nộp bài (cảnh báo nếu học viên còn câu hỏi chưa điền đáp án) */}
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

      {/* Hộp thoại Popup cảnh báo khi học viên cố gắng rời trang lúc đang làm bài thi */}
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
