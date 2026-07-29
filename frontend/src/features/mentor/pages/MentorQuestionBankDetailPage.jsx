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
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import { PRIMARY, MUTED, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import questionBankService from '@/features/mentor/services/questionBankService';
import axios from 'axios';

/** Chỉnh demo khóa học + chương tại đây (theo courseId) */
//   1: {
//     CourseId: 1,
//     CourseName: 'Tiếng Anh Thương Mại & Giao Tiếp Công Sở',
//     IsPublished: 1,
//     CategoryDisplayName: 'Tiếng Anh thương mại',
//     LevelDisplayName: 'Trung cấp',
//     CourseUpdateAt: '2026-03-18T10:30:00.000Z',
//   },
//   2: {
//     CourseId: 2,
//     CourseName: 'IELTS Band 6.5 – Luyện thi Toàn diện',
//     IsPublished: 1,
//     CategoryDisplayName: 'Luyện thi',
//     LevelDisplayName: 'Nâng cao',
//     CourseUpdateAt: '2026-04-02T14:15:00.000Z',
//   },
//   3: {
//     CourseId: 3,
//     CourseName: 'Tiếng Anh Giao Tiếp Đời Sống Hằng Ngày',
//     IsPublished: 1,
//     CategoryDisplayName: 'Giao tiếp',
//     LevelDisplayName: 'Cơ bản',
//     CourseUpdateAt: '2026-02-10T09:00:00.000Z',
//   },
// };

// const MOCK_CHAPTERS_BY_COURSE_ID = {
//   1: [
//     {
//       PathId: 1,
//       PathName: 'Khởi động & Làm quen thuật ngữ',
//       Order: 1,
//       Nodes: [{ NodeId: 101, NodeName: 'Chào hỏi công sở', NodeOrder: 1 }],
//     },
//     {
//       PathId: 2,
//       PathName: 'Kỹ năng viết Email chuyên nghiệp',
//       Order: 2,
//       Nodes: [{ NodeId: 201, NodeName: 'Cấu trúc email', NodeOrder: 1 }],
//     },
//   ],
//   3: [
//     {
//       PathId: 1,
//       PathName: 'Chào hỏi & Giới thiệu bản thân',
//       Order: 1,
//       Nodes: [{ NodeId: 301, NodeName: 'Hello & Hi', NodeOrder: 1 }],
//     },
//     {
//       PathId: 2,
//       PathName: 'Mua sắm & Hỏi giá',
//       Order: 2,
//       Nodes: [{ NodeId: 302, NodeName: 'How much is it?', NodeOrder: 1 }],
//     },
//     {
//       PathId: 3,
//       PathName: 'Nhà hàng & Gọi món',
//       Order: 3,
//       Nodes: [{ NodeId: 303, NodeName: 'Can I have the menu?', NodeOrder: 1 }],
//     },
//   ],
// };

//________Component con: thẻ hiển thị một chương trong danh sách__________
// Trigger click → gọi onOpen(path) để parent navigate sang trang workspace
function PathChapterCard({ path, onOpen, stats, statsLoaded = false }) {
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

  // ===== STATE =====
  // course: thông tin khóa học từ API
  const [course, setCourse] = useState();
  // coursePaths: danh sách chương (paths) của khóa học
  const [coursePaths, setCoursePaths] = useState([]);
  const [chapterStatsByPathId, setChapterStatsByPathId] = useState({});
  const [statsLoaded, setStatsLoaded] = useState(false);

  // ==========
  useEffect(() => {
    const fetchCourse = async () => {
      const user = JSON.parse(localStorage.getItem("user"))
      const reCourses = await axios.get(`http://localhost:5000/api/courses/my-courses/${courseId}?tab=course`,
        {
          headers: {
            "x-user-id": user.userId
          }
        })
      setCourse(reCourses.data.data[0])
      setCoursePaths(reCourses.data.data[0].Paths)
    }
    fetchCourse()
  }, [courseId]);

  // Sau khi biết đang xem khóa học nào (courseId), tải thống kê ngân hàng câu hỏi theo từng chương.
  useEffect(() => {
    // Chưa có mã khóa học trên đường dẫn → không gọi server, thoát sớm.
    if (!courseId) return undefined;

    // Cờ “đã hủy”: nếu mentor chuyển sang khóa khác trước khi server trả lời, bỏ qua kết quả cũ (tránh hiển thị nhầm khóa).
    let cancelled = false;

    // Bắt đầu tải lại: ẩn số liệu cũ và báo UI là “đang chờ thống kê”.
    setStatsLoaded(false);
    setChapterStatsByPathId({});

    // Hàm bất đồng bộ: gọi API trong nền, không chặn màn hình.
    (async () => {
      // Lấy thống kê cả khóa (mỗi chương: số bài nghe/đọc/từ vựng, v.v.).
      const coureQuestionBankActiveStats = await questionBankService.getCourseQuestionBankActiveStats(courseId);

      // Mentor đã rời khóa này → không cập nhật state nữa.
      if (cancelled) return;

      // Gom danh sách chương từ server: mã chương → thống kê của chương đó (để mỗi thẻ chương tra nhanh).
      const byPathId = {};
      for (const chapter of coureQuestionBankActiveStats.chapters ?? []) {
        byPathId[String(chapter.PathId)] = chapter;
      }

      // Lưu thống kê lên màn hình; đánh dấu đã tải xong để thẻ chương hiện đúng (kể cả “chưa có câu hỏi”).
      setChapterStatsByPathId(byPathId);
      setStatsLoaded(true);

      // Server báo lỗi → hiện thông báo đỏ cho mentor.
      if (!coureQuestionBankActiveStats.ok && coureQuestionBankActiveStats.message) {
        toast.error(coureQuestionBankActiveStats.message);
      }
    })();

    // Dọn dẹp khi courseId đổi hoặc rời trang: các lần gọi API cũ sẽ bị bỏ qua nhờ cancelled = true.
    return () => {
      cancelled = true;
    };
  }, [courseId]); // Chạy lại mỗi khi mentor mở khóa học khác trên URL.


  // Handler: click thẻ chương → chuyển sang workspace chỉnh sửa câu hỏi
  const openPath = (path) => {
    navigate(`/mentor/question-banks/${courseId}/${path.PathId}`, {
      state: {
        CourseName: course?.CourseName,
        PathName: path.PathName,
        PathOrder: path.Order,
        IsPublished: course?.IsPublished,
        CategoryDisplayName: course?.CategoryDisplayName,
        LevelDisplayName: course?.LevelDisplayName,
      },
    });
  };


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
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED, mt: 1 }}>
          Chọn chương để quản lý câu hỏi
        </Typography>
      </Box>

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
    </Box>
  );

}