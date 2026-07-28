/**
 * =============================================================================
 * MentorQuestionBankRow — Một dòng khóa học trong danh sách QB
 * =============================================================================
 *
 * MỤC ĐÍCH: Hiển thị thông tin khóa học + metrics câu hỏi; nút "Quản lý câu hỏi".
 * LUỒNG: Click "Quản lý câu hỏi" → navigate /mentor/question-banks/:courseId
 *
 * MentorQuestionBankRow — layout mirror MentorCourseRow, metrics tập trung câu hỏi.
 */
import {
  Box,
  Chip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import { useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import ThumbnailImage from '@/shared/ui/ThumbnailImage';
import { toast } from '@/shared/ui/Toast';
import {
  formatMentorCourseDate,
  truncateText,
} from '@/features/mentor/utils/mentorCourseUtils';
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
//_______Status Chip IsPublished Course______________________
function getStatusChip(IsPublished) {
  if (IsPublished) {
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
function MetricItem({ icon: Icon, label, value, iconColor }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
      <Icon sx={{ fontSize: 15, color: iconColor, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>
        {label}: <Box component="span" sx={{ color: TEXT, fontWeight: 600 }}>{value}</Box>
      </Typography>
    </Box>
  );
}
export default function MentorQuestionBankRow({ bankItem }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const statusChip = getStatusChip(bankItem.IsPublished);

  // Handler: chuyển sang trang chọn chương của khóa học
  const handleManageQuestions = () => {
    if (!bankItem.BankId || !bankItem.CourseId) {
      toast.info('Không xác định được Question Bank hoặc Khóa học.');
      return;
    }
    navigate(`/mentor/question-banks/${bankItem.CourseId}`);
  };
  return (
    <Box
      sx={{
        position: 'relative',
        p: { xs: 2, sm: 2.25 },
        borderRadius: '20px',
        bgcolor: '#FFFFFF',
        border: `1px solid ${alpha('#0F172A', 0.08)}`,
        boxShadow: theme.ios18?.shadow?.sm,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 1.75, md: 2.5 },
      }}
    >
      <ThumbnailImage
        src={bankItem.Thumbnail}
        label={bankItem.CourseName}
        alt={bankItem.CourseName}
        iconSize={28}
        sx={{
          width: { xs: '100%', sm: 112 },
          height: { xs: 140, sm: 72 },
          borderRadius: '14px',
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0, pr: { xs: 10, md: 0 } }}>
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
          {bankItem.CourseName}
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
          {truncateText(bankItem.CourseDescription, 140)}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
          <MetricItem
            icon={QuizOutlinedIcon}
            label="Tổng câu hỏi: "
            value={bankItem.TotalQuestion ?? 0}
            iconColor={METRIC_COLORS.total}
          />
          <MetricItem
            icon={CheckCircleOutlineRoundedIcon}
            label="Dùng trong test: "
            value={bankItem.TotalQuestionIsPublic ?? 0}
            iconColor={METRIC_COLORS.published}
          />
          <MetricItem
            icon={EditNoteRoundedIcon}
            label="Bản nháp"
            value={bankItem.TotalDraftQuestion ?? Math.max(
              0,
              Number(bankItem.TotalQuestion) - Number(bankItem.TotalQuestionIsPublic),
            )}
            iconColor={METRIC_COLORS.draft}
          />
          <MetricItem
            icon={RouteOutlinedIcon}
            label="Chương có câu hỏi"
            value={`${bankItem.PathHasQuestion ?? 0}/${bankItem.TotalPath ?? 0}`}
            iconColor={METRIC_COLORS.chapters}
          />
          <MetricItem
            icon={AssignmentOutlinedIcon}
            label="Quiz/Test"
            //___quizCount is Null, can only fix by sql query____________________________________________________________
            value={bankItem.quizCount ?? 0}
            iconColor={METRIC_COLORS.quiz}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <CalendarTodayOutlinedIcon
              sx={{ fontSize: 15, color: METRIC_COLORS.updated, flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              Cập nhật ngân hàng:{' '}
              <Box component="span" sx={{ color: TEXT, fontWeight: 600 }}>
                {formatMentorCourseDate(bankItem.UpdatedAt)}
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
      {/* Chip trạng thái xuất bản khóa học */}
      <Box
        sx={{
          position: { xs: 'absolute', md: 'static' },
          top: { xs: 16, md: 'auto' },
          right: { xs: 16, md: 'auto' },
          flexShrink: 0,
          alignSelf: { md: 'flex-start' },
        }}
      >
        <Chip
          size="small"
          label={statusChip.label}
          sx={{ ...PILL_CHIP_SX, ...statusChip.sx }}
        />
      </Box>
    </Box>
  );
}
