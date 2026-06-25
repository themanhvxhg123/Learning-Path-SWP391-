import {
  Box,
  Breadcrumbs,
  Chip,
  Link as MuiLink,
  Tab,
  Tabs,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import UnpublishedRoundedIcon from '@mui/icons-material/UnpublishedRounded';
import { Link, useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import MentorCourseMetricsInline from './MentorCourseMetricsInline';
import { PRIMARY, TEXT, MUTED, DETAIL_ENTITY_TITLE_SX } from './mentorCourseCreateStyles';
import ThumbnailImage from '@/shared/ui/ThumbnailImage';
import { isCoursePublished } from '@/features/mentor/utils/mentorCourseUtils';
import { MENTOR_COURSE_DETAIL_TABS } from '@/features/mentor/utils/mentorCourseDetailUtils';
import { resolveCategoryChipSx, resolveLevelChipSx } from '@/shared/catalog/catalogRegistry';

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
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const published = isCoursePublished(course);
  const statusChip = getStatusChip(published);
  const editPath = `/mentor/courses/${course.CourseId}/edit`;
  const questionsPath = `/mentor/courses/${course.CourseId ?? course.courseId}/questions`;

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
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'flex-start' },
            gap: 2,
          }}
        >
          <ThumbnailImage
            src={course.Thumbnail}
            label={course.CourseName}
            alt={course.CourseName}
            cacheKey={course.CourseUpdateAt ?? course.UpdatedAt ?? course.CourseCreateAt}
            iconSize={28}
            sx={{
              width: { xs: '100%', sm: 112 },
              height: { xs: 140, sm: 72 },
              borderRadius: '14px',
              flexShrink: 0,
            }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography sx={DETAIL_ENTITY_TITLE_SX}>
                {course.CourseName}
              </Typography>
              <Chip size="small" label={statusChip.label} sx={{ ...PILL_CHIP_SX, ...statusChip.sx }} />
            </Box>

            {course.Description && (
              <Typography
                sx={{
                  fontSize: 14,
                  color: MUTED,
                  lineHeight: 1.6,
                  mb: 1.25,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {course.Description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.5 }}>
              {course.CategoryName && (
                <Chip
                  size="small"
                  label={course.CategoryDisplayName}
                  sx={{
                    ...PILL_CHIP_SX,
                    ...resolveCategoryChipSx({
                      id: course.CategoryId,
                      displayName: course.CategoryDisplayName ?? course.CategoryName,
                    }),
                  }}
                />
              )}
              {course.LevelDisplayName && (
                <Chip
                  size="small"
                  label={course.LevelDisplayName}
                  sx={{
                    ...PILL_CHIP_SX,
                    ...resolveLevelChipSx({
                      id: course.LevelId,
                      displayName: course.LevelDisplayName ?? course.levelName,
                    }),
                  }}
                />
              )}
            </Box>
            {/* Metric (total {student, paths, node, materials, rate,...}) */}
            <MentorCourseMetricsInline course={course} />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'row', md: 'column' },
              gap: 1,
              flexShrink: 0,
              alignSelf: { xs: 'stretch', md: 'flex-start' },
            }}
          >
            {/* 
            ----------------Button Edit Course----------------
             */}
            <AppButton
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate(editPath)}
              sx={{
                height: 38,
                borderRadius: '999px',
                fontSize: 13,
                fontWeight: 700,
                px: 2,
                flex: { xs: 1, md: 'unset' },
              }}
            >
              Chỉnh sửa
            </AppButton>

            {/* 
            -------------Button Question Bank---------------
             */}
            <AppButton
              variant="outlined"
              startIcon={<QuizOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate(questionsPath)}
              sx={{
                height: 38,
                borderRadius: '999px',
                fontSize: 13,
                fontWeight: 700,
                px: 2,
                flex: { xs: 1, md: 'unset' },
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

            <AppButton
              startIcon={
                published ? (
                  <UnpublishedRoundedIcon sx={{ fontSize: 16 }} />
                ) : (
                  <PublishRoundedIcon sx={{ fontSize: 16 }} />
                )
              }
              onClick={onPublishToggle}
              disabled={publishing}
              sx={{
                height: 38,
                borderRadius: '999px',
                fontSize: 13,
                fontWeight: 700,
                px: 2,
                bgcolor: PRIMARY,
                color: '#fff',
                flex: { xs: 1, md: 'unset' },
                boxShadow: 'none',
                '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
              }}
            >
              {published ? 'Hủy xuất bản' : 'Xuất bản'}
            </AppButton>
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
