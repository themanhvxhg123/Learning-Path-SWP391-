import {
  Box,
  Breadcrumbs,
  Chip,
  Link as MuiLink,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import UnpublishedRoundedIcon from '@mui/icons-material/UnpublishedRounded';
import { Link, useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import MentorCourseMetricsInline from './MentorCourseMetricsInline';
import { PRIMARY, TEXT, MUTED, DETAIL_ENTITY_TITLE_SX } from './mentorCourseCreateStyles';
import { isCoursePublished } from '@/features/mentor/utils/mentorCourseUtils';
import { MENTOR_COURSE_DETAIL_TABS } from '@/features/mentor/utils/mentorCourseDetailUtils';
import { buildQuestionBankCoursePath } from '@/features/mentor/utils/mentorQuestionBankListParams';

const PILL_CHIP_SX = {
  borderRadius: '999px',
  height: 24,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '24px',
  '& .MuiChip-label': {
    px: 1.2,
    lineHeight: '24px',
    fontWeight: 700,
  },
};

function getStatusChip(isPublished) {
  if (isPublished) {
    return {
      label: 'Đã xuất bản',
      sx: {
        bgcolor: 'rgba(4,120,87,0.12)',
        color: '#047857',
        border: '1px solid rgba(4,120,87,0.24)',
      },
    };
  }
  return {
    label: 'Bản nháp',
    sx: {
      bgcolor: 'rgba(100,116,139,0.10)',
      color: MUTED,
      border: '1px solid rgba(100,116,139,0.18)',
    },
  };
}

export default function MentorCourseDetailHeader({
  course,
  activeTab,
  onTabChange,
  onPublishToggle,
  publishing = false,
  publishBlockReason = null,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const published = isCoursePublished(course);
  const statusChip = getStatusChip(published);
  const questionBankPath = buildQuestionBankCoursePath(course.CourseId ?? course.courseId);
  const publishBlocked = !published && Boolean(publishBlockReason);

  // console.log(course)
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2,
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
          <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600, maxWidth: 280 }} noWrap>
            {course.CourseName}
          </Typography>
        </Breadcrumbs>

        <AppButton
          variant="outlined"
          startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate('/mentor/courses')}
          sx={{
            height: 36,
            borderRadius: '999px',
            fontSize: 13,
            fontWeight: 600,
            px: 1.75,
            color: TEXT,
            borderColor: 'rgba(15,23,42,0.12)',
          }}
        >
          Quay lại
        </AppButton>
      </Box>

      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '20px',
          bgcolor: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: theme.ios18?.shadow?.sm ?? '0 1px 2px rgba(8,145,178,0.04)',
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography sx={DETAIL_ENTITY_TITLE_SX}>
                {course.CourseName}
              </Typography>
              <Chip size="small" label={statusChip.label} sx={{ ...PILL_CHIP_SX, ...statusChip.sx }} />
            </Box>
            <MentorCourseMetricsInline course={course} />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: { xs: 'stretch', sm: 'flex-end' },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <AppButton
              variant="outlined"
              startIcon={<QuizOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate(questionBankPath)}
              sx={{
                height: 38,
                borderRadius: '999px',
                fontSize: 13,
                fontWeight: 700,
                px: 2,
                flex: { xs: '1 1 0', sm: '0 0 auto' },
                minWidth: { xs: 0, sm: 'auto' },
                color: '#7C3AED',
                borderColor: 'rgba(124,58,237,0.28)',
                '&:hover': {
                  borderColor: 'rgba(124,58,237,0.45)',
                  bgcolor: 'rgba(124,58,237,0.04)',
                },
              }}
            >
              Ngân hàng câu hỏi
            </AppButton>

            {/* 
            ---------------Button set publish course--------------------
            */}

            {(() => {
              const publishButton = (
                <AppButton
                  startIcon={
                    published ? (
                      <UnpublishedRoundedIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <PublishRoundedIcon sx={{ fontSize: 16 }} />
                    )
                  }
                  onClick={onPublishToggle}
                  disabled={publishing || publishBlocked}
                  sx={{
                    height: 38,
                    borderRadius: '999px',
                    fontSize: 13,
                    fontWeight: 700,
                    px: 2,
                    bgcolor: PRIMARY,
                    color: '#fff',
                    flex: { xs: '1 1 0', sm: '0 0 auto' },
                    minWidth: { xs: 0, sm: 'auto' },
                    boxShadow: 'none',
                    opacity: publishBlocked ? 0.72 : 1,
                    '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
                  }}
                >
                  {published ? 'Hủy xuất bản' : 'Xuất bản'}
                </AppButton>
              );

              if (!publishBlocked) return publishButton;

              return (
                <Tooltip title={publishBlockReason} arrow placement="top">
                  <span>{publishButton}</span>
                </Tooltip>
              );
            })()}
          </Box>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => onTabChange(value)}
        sx={{
          minHeight: 42,
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '999px',
            bgcolor: PRIMARY,
          },
          '& .MuiTab-root': {
            minHeight: 42,
            textTransform: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: MUTED,
            px: 2,
            '&.Mui-selected': { color: PRIMARY, fontWeight: 700 },
          },
        }}
      >
        <Tab value={MENTOR_COURSE_DETAIL_TABS.COURSE} label="Khóa học" />
        <Tab value={MENTOR_COURSE_DETAIL_TABS.CONTENT} label="Nội dung" />
        <Tab value={MENTOR_COURSE_DETAIL_TABS.STUDENTS} label="Học viên" />
        <Tab value={MENTOR_COURSE_DETAIL_TABS.COMMENTS} label="Bình luận" />
      </Tabs>
    </Box>
  );
}
