/**
 * =============================================================================
 * MentorQuestionBankDetailPage — Trang chọn chương để quản lý câu hỏi
 * =============================================================================
 *
 * MỤC ĐÍCH: Hiển thị danh sách chương của một khóa học; mentor chọn chương
 *            để vào workspace chỉnh sửa ngân hàng câu hỏi.
 *
 * ROUTE URL: /mentor/question-banks/:courseId
 *
 * LUỒNG CHÍNH:
 *   1. Tải thông tin khóa học + danh sách chương từ API
 *   2. Hiển thị grid các thẻ chương (PathChapterCard)
 *   3. Click chương → navigate sang /mentor/question-banks/:courseId/:pathId
 *
 * MentorQuestionBankDetailPage — UI shell (paths list + editor), không fetch API đầy đủ.
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import EmptyState from '@/shared/ui/EmptyState';
import { toast } from '@/shared/ui/Toast';
import ScrollToTopButton from '@/shared/ui/ScrollToTopButton';
import MentorQuestionBankBuilderPanel from '@/features/mentor/components/questionBank/MentorQuestionBankBuilderPanel';
import MentorQuestionBankDetailHeader from '@/features/mentor/components/questionBank/MentorQuestionBankDetailHeader';
import MentorQuestionBankOutlinePanel from '@/features/mentor/components/questionBank/MentorQuestionBankOutlinePanel';
import MentorQuestionBankSkillNav from '@/features/mentor/components/questionBank/MentorQuestionBankSkillNav';
import useQuestionBankEditorUi from '@/features/mentor/hooks/useQuestionBankEditorUi';
import { PRIMARY, MUTED, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  countActiveQuestionsBySkill,
  getFilledQuestionCount,
} from '@/features/mentor/utils/mentorTestContentUtils';
import { formatMentorCourseDate } from '@/features/mentor/utils/mentorCourseUtils';
import {
  getMockChaptersForCourse,
  getMockCourseFromQuestionBank,
} from '@/features/mentor/data/mentorQuestionBankMock';
import { getCourseQuestionBankActiveStats } from '@/features/mentor/services/questionBankService';
import axios from 'axios';

//________Component con: thẻ hiển thị một chương trong danh sách__________
// Trigger click → gọi onOpen(path) để parent navigate sang trang workspace
function PathChapterCard({ path, index, onOpen, stats, statsLoaded = false }) {
  const theme = useTheme();
  const listeningSectionCount = stats?.listeningSectionGroups?.length ?? 0;
  const readingSectionCount = stats?.readingSectionGroups?.length ?? 0;
  const vocabularyQuestionCount = stats?.questionCountBySkill?.VOCABULARY ?? 0;
  const hasQuestionBankContent =
    listeningSectionCount > 0 || readingSectionCount > 0 || vocabularyQuestionCount > 0;
  const showMissingBankBadge = statsLoaded && !hasQuestionBankContent;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(path)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        textAlign: 'left',
        p: 2,
        borderRadius: '20px',
        bgcolor: '#FFFFFF',
        border: `1px solid ${alpha('#0F172A', 0.08)}`,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        boxShadow: theme.ios18?.shadow?.sm ?? 'none',
        '&:hover': {
          borderColor: alpha(PRIMARY, 0.28),
          boxShadow: theme.ios18?.shadow?.md ?? `0 8px 24px ${alpha('#0F172A', 0.08)}`,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '14px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(PRIMARY, 0.1),
          color: PRIMARY,
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        {path.Order}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 0.35,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 700,
              color: TEXT,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: '1 1 auto',
            }}
          >
            {path.PathName}
          </Typography>
          {showMissingBankBadge ? (
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                py: 0.25,
                borderRadius: '999px',
                bgcolor: alpha('#DC2626', 0.1),
                border: `1px solid ${alpha('#DC2626', 0.22)}`,
                color: '#DC2626',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.4,
                flexShrink: 0,
              }}
            >
              Chưa có question bank
            </Box>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
          <QuizOutlinedIcon sx={{ fontSize: 15, color: MUTED, mt: 0.15 }} />
          <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.45 }}>
            Nghe: {listeningSectionCount} section
            {' · '}
            Đọc: {readingSectionCount} section
            {' · '}
            Từ vựng/Ngữ pháp: {vocabularyQuestionCount} câu
          </Typography>
        </Box>
      </Box>

      <ChevronRightRoundedIcon sx={{ fontSize: 22, color: MUTED, flexShrink: 0 }} />
    </Box>
  );
}
//________________________________________________________
export default function MentorQuestionBankDetailPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== STATE =====
  // course: thông tin khóa học từ API
  const [course, setCourse] = useState();
  // coursePaths: danh sách chương (paths) của khóa học
  const [coursePaths, setCoursePaths] = useState([]);
  const [chapterStatsByPathId, setChapterStatsByPathId] = useState({});
  const [statsLoaded, setStatsLoaded] = useState(false);

  // ===== useEffect: TẢI KHÓA HỌC + DANH SÁCH CHƯƠNG =====
  useEffect(() => {
    const fetchData = async () => {
      setStatsLoaded(false);
      try {
        const [resCourse, resCoursePaths, statsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/courses/my-courses/${courseId}?tab=course`),
          axios.get(`http://localhost:5000/api/courses/my-courses/${courseId}/chapters`),
          getCourseQuestionBankActiveStats(courseId),
        ]);

        setCourse(resCourse.data.data[0]);
        setCoursePaths(resCoursePaths.data.data.Paths ?? []);

        const nextStatsByPathId = {};
        if (statsRes.ok) {
          (statsRes.chapters ?? []).forEach((chapter) => {
            nextStatsByPathId[String(chapter.PathId)] = chapter;
          });
        }
        setChapterStatsByPathId(nextStatsByPathId);
      } catch (error) {
        console.error(error.message);
      } finally {
        setStatsLoaded(true);
      }
    };
    fetchData();
  }, [courseId]);

  const chapterId = searchParams.get('chapterId') ?? '';
  // const isEditorMode = searchParams.get('mode') === 'editor';
  // const isPathListMode = !chapterId;

  // const course = getMockCourseFromQuestionBank(courseId);
  const courseChapters = getMockChaptersForCourse(courseId);
  const selectedChapter = courseChapters.find(
    (item) => String(item.PathId) === String(chapterId),
  );

  // const bank = useMemo(
  //   () => ({
  //     id: questionBankId,
  //     courseId: Number(courseId) || courseId,
  //     courseTitle: course?.CourseName ?? `Khóa học #${courseId}`,
  //     chapterId: chapterId ? Number(chapterId) : null,
  //     PathName: selectedChapter?.PathName ?? '',
  //     title: selectedChapter?.PathName ?? 'Ngân hàng câu hỏi',
  //     updatedAt: course?.CourseUpdateAt,
  //   }),
  //   [questionBankId, courseId, course, chapterId, selectedChapter],
  // );

  const bankPaths = useMemo(
    () =>
      courseChapters.map((path, index) => ({
        ...path,
        displayLabel: `Chương ${path.Order ?? index + 1}: ${path.PathName}`,
        QuestionCount: 0,
      })),
    [courseChapters],
  );

  const workspaceKey = `${courseId}-${chapterId || 'none'}`;

  const {
    sections,
    sectionErrors,
    activeSkill,
    activeSection,
    activeSectionIndex,
    skillSections,
    activeSectionId,
    handleSectionChange,
    handleSkillSelect,
    handleSectionSelect,
    handleAddBai,
    handleOutlineNavigate,
  } = useQuestionBankEditorUi({ resetKey: chapterId || null });

  const questionCount = useMemo(() => getFilledQuestionCount(sections), [sections]);

  const questionCountBySkill = useMemo(
    () => countActiveQuestionsBySkill(sections),
    [sections],
  );

  const courseCategory = useMemo(
    () => [course?.CategoryDisplayName, course?.LevelDisplayName].filter(Boolean).join(' · '),
    [course],
  );

  // Handler: click thẻ chương → chuyển sang workspace chỉnh sửa câu hỏi
  const openPath = (path) => {
    navigate(`/mentor/question-banks/${courseId}/${path.PathId}`, {
      state: {
        courseName: course?.CourseName,
        pathName: path.PathName,
        pathOrder: path.Order,
        coursePublished: course?.IsPublished,
        categoryName: course?.CategoryDisplayName ?? course?.categoryName,
        levelName: course?.LevelDisplayName ?? course?.levelName,
      },
    });
  };

  const selectChapter = (nextChapterId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('courseId', courseId);
        next.set('chapterId', String(nextChapterId));
        next.set('mode', 'editor');
        return next;
      },
      { replace: true },
    );
  };

  const handleSubmit = () => {
    toast.info('Logic lưu question bank sẽ được implement lại.');
  };

  const footerActions = (
    <AppButton
      startIcon={<SaveOutlinedIcon />}
      onClick={handleSubmit}
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
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto', py: 2 }}>
      {/* Nút quay lại danh sách ngân hàng câu hỏi */}
      <Box sx={{ mb: 2 }}>
        <AppButton
          variant="text"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/mentor/question-banks')}
          sx={{
            height: 36,
            px: 0.5,
            color: MUTED,
            fontWeight: 600,
            fontSize: 13,
            '&:hover': { bgcolor: 'transparent', color: PRIMARY },
          }}
        >
          Quay lại danh sách
        </AppButton>
      </Box>

      {/* Banner tiêu đề khóa học */}
      <Box
        sx={{
          mb: 2.5,
          p: { xs: 2, sm: 2.5 },
          borderRadius: '22px',
          background: `linear-gradient(135deg, ${alpha(PRIMARY, 0.09)} 0%, #fff 70%)`,
          border: `1px solid ${alpha(PRIMARY, 0.14)}`,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY, mb: 0.75 }}>
          NGÂN HÀNG CÂU HỎI
        </Typography>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, color: TEXT, mb: 0.5 }}>
          {course?.CourseName ?? 'Đang tải khóa học...'}
        </Typography>
        <Typography sx={{ fontSize: 14, color: MUTED }}>
          {/* {courseCategory ? `${courseCategory} · ` : ''}
          {bankPaths.length} chương · {totalQuestions} câu hỏi
          {bank.updatedAt ? ` · Cập nhật ${formatMentorCourseDate(bank.updatedAt)}` : ''} */}
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED, mt: 1 }}>
          Chọn chương để quản lý câu hỏi
        </Typography>
      </Box>

      {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <AppButton
          onClick={() => navigate(`/mentor/question-banks/manage?courseId=${courseId}`)}
          sx={{ height: 40, borderRadius: '999px', bgcolor: PRIMARY, boxShadow: 'none' }}
        >
          Thêm chương
        </AppButton>
      </Box> */}

      {/* {bankPaths.length === 0 ? (
        <EmptyState
          icon={MenuBookOutlinedIcon}
          title="Chưa có chương nào trong ngân hàng"
          description="Tạo ngân hàng câu hỏi cho một chương để bắt đầu."
          actionLabel="Thêm chương"
          onAction={() => navigate(`/mentor/question-banks/manage?courseId=${courseId}`)}
        />
      ) : ( */}
      {/* Grid danh sách chương — click để mở workspace */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 1.5,
        }}
      >
        {coursePaths.map((path, index) => (
          <PathChapterCard
            key={path.PathId}
            path={path}
            index={index}
            onOpen={openPath}
            stats={chapterStatsByPathId[String(path.PathId)]}
            statsLoaded={statsLoaded}
          />
        ))}
      </Box>
      {/* )} */}
    </Box>
  );

}