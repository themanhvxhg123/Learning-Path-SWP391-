/**
 * MentorCourseQuestionsPage — danh sách ngân hàng câu hỏi theo chương của một khóa học.
 * Route: /mentor/courses/:courseId/questions
 */
import { useEffect, useState } from 'react';
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
import Loading from '@/shared/ui/Loading';
import EmptyState from '@/shared/ui/EmptyState';
import { mentorQuestionBankMock } from '@/features/mentor/data/mentorQuestionBankMock';
import {
  fetchCourseForQB,
  getQuestionBanksByCourse,
} from '@/features/mentor/services/questionBankService';
import { formatMentorCourseDate } from '@/features/mentor/utils/mentorCourseUtils';

import {
  PAGE_DESCRIPTION_SX,
  PAGE_TITLE_SX,
} from '@/features/mentor/components/course/mentorCourseCreateStyles';

const TEXT = '#0F172A';
const MUTED = '#64748B';
const PRIMARY = '#0891B2';

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
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT, mb: 0.35 }}>
          {bank.chapterTitle || bank.title || `Chương #${bank.chapterId}`}
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED, mb: 1 }}>
          {questionCount} câu hỏi · Cập nhật {formatMentorCourseDate(bank.updatedAt ?? bank.questionBankUpdatedAt)}
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
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const [courseRes, banksRes] = await Promise.all([
          fetchCourseForQB(courseId),
          getQuestionBanksByCourse(courseId),
        ]);

        if (!mounted) return;

        const mockCourse = mentorQuestionBankMock.find(
          (c) => String(c.courseId) === String(courseId),
        );
        setCourseName(
          courseRes.ok
            ? courseRes.course?.CourseName
            : mockCourse?.courseName ?? `Khóa học #${courseId}`,
        );
        setBanks(banksRes.ok ? banksRes.banks : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const handleManage = (bank) => {
    navigate(
      `/mentor/question-banks/${bank.id ?? bank.BankId}?courseId=${courseId}&chapterId=${bank.chapterId}`,
    );
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
            {courseName || `Khóa học #${courseId}`}
          </MuiLink>
          <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
            Ngân hàng câu hỏi
          </Typography>
        </Breadcrumbs>

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
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Quay lại khóa học
        </AppButton>
      </Box>

      <Typography component="h1" sx={{ ...PAGE_TITLE_SX, mb: 0.75 }}>
        Ngân hàng câu hỏi theo chương
      </Typography>
      <Typography sx={{ ...PAGE_DESCRIPTION_SX, mb: 2.5 }}>
        Khóa học:{' '}
        <Box component="span" sx={{ fontWeight: 600, color: TEXT }}>
          {courseName}
        </Box>
      </Typography>

      {loading ? (
        <Loading message="Đang tải ngân hàng câu hỏi..." />
      ) : banks.length === 0 ? (
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
            onAction={() =>
              navigate(`/mentor/question-banks/create?courseId=${courseId}`)
            }
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {banks.map((bank) => (
            <BankRow key={bank.id} bank={bank} onManage={handleManage} />
          ))}
        </Box>
      )}

      {!loading && banks.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <AppButton
            variant="outlined"
            startIcon={<MenuBookOutlinedIcon />}
            onClick={() =>
              navigate(`/mentor/question-banks/create?courseId=${courseId}`)
            }
            sx={{ height: 40, borderRadius: '999px', fontWeight: 600 }}
          >
            Tạo bộ câu hỏi mới
          </AppButton>
        </Box>
      )}
    </Box>
  );
}
