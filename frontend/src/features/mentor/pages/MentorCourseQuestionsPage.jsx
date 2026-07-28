/**
 * MentorCourseQuestionsPage — UI + mock, không gọi API.
 */
import { useMemo } from 'react';
import {
  Box,
  Breadcrumbs,
  Link as MuiLink,
  Typography,
  alpha,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import EmptyState from '@/shared/ui/EmptyState';
import { formatMentorCourseDate } from '@/features/mentor/utils/mentorCourseUtils';

const TEXT = '#0F172A';
const MUTED = '#64748B';
const PRIMARY = '#0891B2';

/** Chỉnh demo khóa học tại đây */
const MOCK_COURSES_BY_ID = {
  1: { CourseName: 'Tiếng Anh Thương Mại & Giao Tiếp Công Sở' },
  2: { CourseName: 'IELTS Band 6.5 – Luyện thi Toàn diện' },
  3: { CourseName: 'Tiếng Anh Giao Tiếp Đời Sống Hằng Ngày' },
};

/** Chỉnh demo bank theo chương tại đây (key = courseId) */
const MOCK_CHAPTER_BANKS_BY_COURSE_ID = {
  3: [
    {
      id: 3001,
      chapterId: 1,
      chapterTitle: 'Chào hỏi & Giới thiệu bản thân',
      title: 'Chào hỏi & Giới thiệu bản thân',
      totalQuestionCount: 15,
      updatedAt: '2026-04-01T10:00:00.000Z',
    },
    {
      id: 3002,
      chapterId: 2,
      chapterTitle: 'Mua sắm & Hỏi giá',
      title: 'Mua sắm & Hỏi giá',
      totalQuestionCount: 18,
      updatedAt: '2026-03-28T14:30:00.000Z',
    },
  ],
};

function BankRow({ bank, onManage }) {
  const questionCount = bank.totalQuestionCount ?? 0;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: '#FFFFFF',
        border: `1px solid ${alpha('#0F172A', 0.08)}`,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: TEXT, mb: 0.35 }}>
          {bank.chapterTitle || bank.title || `Chương #${bank.chapterId}`}
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED, mb: 1 }}>
          {questionCount} câu hỏi · Cập nhật {formatMentorCourseDate(bank.updatedAt)}
        </Typography>
      </Box>

      <AppButton
        onClick={() => onManage(bank)}
        sx={{
          height: 40,
          px: 2.5,
          fontSize: 13,
          fontWeight: 700,
          borderRadius: '999px',
          bgcolor: PRIMARY,
          color: '#fff',
          flexShrink: 0,
          width: { xs: '100%', sm: 'auto' },
          boxShadow: 'none',
          '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
        }}
      >
        Quản lý câu hỏi
      </AppButton>
    </Box>
  );
}

export default function MentorCourseQuestionsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const course = MOCK_COURSES_BY_ID[Number(courseId)];
  const banks = useMemo(
    () => MOCK_CHAPTER_BANKS_BY_COURSE_ID[Number(courseId)] ?? [],
    [courseId],
  );
  const courseName = course?.CourseName ?? `Khóa học #${courseId}`;

  const handleManage = (bank) => {
    navigate(`/mentor/question-banks/${courseId}/${bank.chapterId}`);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1.5, sm: 2 },
          mb: 2.5,
        }}
      >
        <Breadcrumbs
          separator="/"
          sx={{ '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 } }}
        >
          <MuiLink
            component={Link}
            to="/home"
            underline="hover"
            sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
          >
            Trang chủ
          </MuiLink>
          <MuiLink
            component={Link}
            to="/mentor/courses"
            underline="hover"
            sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
          >
            Khóa học của tôi
          </MuiLink>
          <MuiLink
            component={Link}
            to={`/mentor/courses/${courseId}`}
            underline="hover"
            sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
          >
            {courseName}
          </MuiLink>
          <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
            Ngân hàng câu hỏi
          </Typography>
        </Breadcrumbs>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'flex-end',
            gap: 1,
            flexShrink: 0,
            ml: { sm: 'auto' },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          <AppButton
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate(`/mentor/courses/${courseId}`)}
            sx={{
              height: 40,
              px: 2,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: '999px',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Quay lại khóa học
          </AppButton>

          <AppButton
            startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigate('/mentor/question-banks')}
            sx={{
              height: 40,
              px: 2,
              fontSize: 13,
              fontWeight: 700,
              borderRadius: '999px',
              width: { xs: '100%', sm: 'auto' },
              bgcolor: PRIMARY,
              color: '#fff',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
            }}
          >
            Quay lại Ngân hàng câu hỏi
          </AppButton>
        </Box>
      </Box>

      <Typography
        component="h1"
        sx={{
          fontSize: { xs: 22, sm: 26 },
          fontWeight: 800,
          color: TEXT,
          letterSpacing: '-0.02em',
          mb: 0.75,
        }}
      >
        Ngân hàng câu hỏi theo chương
      </Typography>

      <Typography sx={{ fontSize: 14, color: MUTED, mb: 2.5, maxWidth: 720, lineHeight: 1.55 }}>
        Khóa học:{' '}
        <Box component="span" sx={{ fontWeight: 700, color: TEXT }}>
          {courseName}
        </Box>
      </Typography>

      {banks.length === 0 ? (
        <Box
          sx={{
            borderRadius: '20px',
            bgcolor: '#FFFFFF',
            border: `1px solid ${alpha('#0F172A', 0.08)}`,
          }}
        >
          <EmptyState
            embedded
            icon={QuizOutlinedIcon}
            title="Chưa có ngân hàng câu hỏi"
            description="Tạo bộ câu hỏi cho từng chương để bắt đầu quản lý."
            actionLabel="Tạo bộ câu hỏi"
            onAction={() => navigate(`/mentor/question-banks/${courseId}`)}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {banks.map((bank) => (
            <BankRow key={bank.id} bank={bank} onManage={handleManage} />
          ))}
        </Box>
      )}

      {banks.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <AppButton
            variant="outlined"
            startIcon={<MenuBookOutlinedIcon />}
            onClick={() => navigate(`/mentor/question-banks/${courseId}`)}
            sx={{ height: 40, borderRadius: '999px', fontWeight: 600 }}
          >
            Tạo bộ câu hỏi mới
          </AppButton>
        </Box>
      )}
    </Box>
  );
}
