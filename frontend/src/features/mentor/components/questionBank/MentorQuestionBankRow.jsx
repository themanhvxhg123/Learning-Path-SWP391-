/**
 * MentorQuestionBankRow — layout mirror MentorCourseRow, metrics tập trung câu hỏi.
 */
import { memo, useCallback, useMemo } from 'react';
import {
  Box,
  Chip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import { useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import {
  formatMentorCourseDate,
  truncateText,
} from '@/features/mentor/utils/mentorCourseUtils';
import ThumbnailImage from '@/shared/ui/ThumbnailImage';
import { resolveLevelChipSx } from '@/shared/catalog/catalogRegistry';

const TEXT = '#0F172A';
const MUTED = '#64748B';
const PRIMARY = '#0891B2';

const METRIC_COLORS = {
  total: '#0891B2',
  published: '#047857',
  draft: '#64748B',
  chapters: '#7C3AED',
  quiz: '#2563EB',
  updated: '#7C3AED',
};

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

const ROW_SX = {
  position: 'relative',
  p: { xs: 2, sm: 2.25 },
  borderRadius: '20px',
  bgcolor: '#FFFFFF',
  border: `1px solid ${alpha('#0F172A', 0.08)}`,
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  alignItems: { xs: 'stretch', md: 'center' },
  gap: { xs: 1.75, md: 2.5 },
  contentVisibility: 'auto',
  containIntrinsicSize: '0 220px',
};

function getStatusChip(status) {
  if (status === 'published') {
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

const MetricItem = memo(function MetricItem({ icon: Icon, label, value, iconColor }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
      <Icon sx={{ fontSize: 15, color: iconColor, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>
        {label}: <Box component="span" sx={{ color: TEXT, fontWeight: 600 }}>{value}</Box>
      </Typography>
    </Box>
  );
});

function MentorQuestionBankRow({ item }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const statusChip = useMemo(() => getStatusChip(item.Status), [item.Status]);
  const description = useMemo(
    () => truncateText(item.Description, 140),
    [item.Description],
  );
  const formattedUpdatedAt = useMemo(
    () => formatMentorCourseDate(item.QuestionBankUpdatedAt),
    [item.QuestionBankUpdatedAt],
  );
  const levelChipSx = useMemo(
    () =>
      item.LevelDisplayName
        ? {
            ...PILL_CHIP_SX,
            ...resolveLevelChipSx({
              id: item.LevelId,
              displayName: item.LevelName ?? item.LevelDisplayName,
            }),
          }
        : null,
    [item.LevelDisplayName, item.LevelId, item.LevelName],
  );

  const handleManageQuestions = useCallback(() => {
    const bankIds = item.BankIds ?? [];

    if (bankIds.length === 0) {
      toast.info('Chưa có ngân hàng câu hỏi cho khóa học này.');
      navigate(`/mentor/question-banks/create?courseId=${item.CourseId}`);
      return;
    }

    if (bankIds.length === 1) {
      navigate(`/mentor/question-banks/${bankIds[0]}?courseId=${item.CourseId}`);
      return;
    }

    navigate(`/mentor/courses/${item.CourseId}/questions`);
  }, [item.BankIds, item.CourseId, navigate]);

  return (
    <Box sx={{ ...ROW_SX, boxShadow: theme.ios18?.shadow?.sm }}>
      <ThumbnailImage
        src={item.Thumbnail}
        label={item.CourseName}
        alt={item.CourseName}
        iconSize={28}
        sx={{
          width: { xs: '100%', sm: 112 },
          height: { xs: 140, sm: 72 },
          borderRadius: '14px',
          flexShrink: 0,
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0, pr: { xs: item.LevelDisplayName ? 18 : 10, md: 0 } }}>
        <Typography
          sx={{
            display: 'block',
            fontSize: { xs: 16, sm: 17 },
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.35,
            mb: 0.75,
          }}
        >
          {item.CourseName}
        </Typography>

        <Typography
          sx={{
            fontSize: 13,
            color: MUTED,
            lineHeight: 1.55,
            mb: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
          <MetricItem
            icon={QuizOutlinedIcon}
            label="Tổng câu hỏi"
            value={item.TotalQuestionCount ?? 0}
            iconColor={METRIC_COLORS.total}
          />
          <MetricItem
            icon={CheckCircleOutlineRoundedIcon}
            label="Đã xuất bản"
            value={item.PublishedQuestionCount ?? 0}
            iconColor={METRIC_COLORS.published}
          />
          <MetricItem
            icon={EditNoteRoundedIcon}
            label="Bản nháp"
            value={item.DraftQuestionCount ?? 0}
            iconColor={METRIC_COLORS.draft}
          />
          <MetricItem
            icon={RouteOutlinedIcon}
            label="Chương có câu hỏi"
            value={item.ChapterWithQuestionCount ?? 0}
            iconColor={METRIC_COLORS.chapters}
          />
          <MetricItem
            icon={AssignmentOutlinedIcon}
            label="Quiz/Test"
            value={item.QuizCount ?? 0}
            iconColor={METRIC_COLORS.quiz}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <CalendarTodayOutlinedIcon
              sx={{ fontSize: 15, color: METRIC_COLORS.updated, flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              Cập nhật ngân hàng:{' '}
              <Box component="span" sx={{ color: TEXT, fontWeight: 600 }}>
                {formattedUpdatedAt}
              </Box>
            </Typography>
          </Box>
        </Box>

        <AppButton
          onClick={handleManageQuestions}
          sx={{
            height: 40,
            px: 2.5,
            fontSize: 13,
            fontWeight: 700,
            borderRadius: '999px',
            bgcolor: PRIMARY,
            color: '#fff',
            boxShadow: 'none',
            width: { xs: '100%', sm: 'auto' },
            '&:hover': {
              bgcolor: '#0E7490',
              boxShadow: 'none',
            },
          }}
        >
          Quản lý câu hỏi
        </AppButton>
      </Box>

      <Box
        sx={{
          position: { xs: 'absolute', md: 'static' },
          top: { xs: 16, md: 'auto' },
          right: { xs: 16, md: 'auto' },
          flexShrink: 0,
          alignSelf: { md: 'flex-start' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'flex-end', md: 'flex-start' },
          flexWrap: 'wrap',
          gap: 0.75,
          maxWidth: { xs: '55%', md: 'none' },
        }}
      >
        {item.LevelDisplayName && levelChipSx && (
          <Chip size="small" label={item.LevelDisplayName} sx={levelChipSx} />
        )}
        <Chip
          size="small"
          label={statusChip.label}
          sx={{ ...PILL_CHIP_SX, ...statusChip.sx }}
        />
      </Box>
    </Box>
  );
}

export default memo(MentorQuestionBankRow);
