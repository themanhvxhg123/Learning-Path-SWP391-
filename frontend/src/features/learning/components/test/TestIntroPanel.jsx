import {
  Box,
  Chip,
  Typography,
  alpha,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AppButton from '@/shared/ui/AppButton';
import { BYPASS_ATTEMPT_LIMIT } from '@/features/learning/services/courseTestService';
import {
  TEST_DIVIDER,
  TEST_MUTED,
  TEST_PRIMARY,
  TEST_TEXT,
  formatDurationMinutes,
} from './testTheme';

export default function TestIntroPanel({
  meta,
  loading = false,
  onStart,
  onBack,
}) {
  const rules = [
    `Thời gian làm bài: ${formatDurationMinutes(meta?.timeLimitMinutes)}.`,
    `Điểm đạt: ${meta?.passingScore ?? 70}%.`,
    `Số lượt làm bài còn lại: ${meta?.remainingAttempts ?? 0}/${meta?.maxAttempts ?? 3}.`,
    meta?.shuffleQuestions !== false
      ? 'Thứ tự câu hỏi có thể được xáo trộn.'
      : 'Câu hỏi giữ nguyên thứ tự.',
    meta?.shuffleAnswers !== false
      ? 'Đáp án có thể được xáo trộn.'
      : 'Đáp án giữ nguyên thứ tự.',
    'Hết giờ hệ thống sẽ tự nộp bài.',
  ];

  const canStart = BYPASS_ATTEMPT_LIMIT || (meta?.remainingAttempts ?? 0) > 0;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: '16px',
        border: `1px solid ${TEST_DIVIDER}`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: { xs: 2.5, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: alpha('#7C3AED', 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <QuizRoundedIcon sx={{ fontSize: 22, color: '#7C3AED' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: 20, md: 24 },
                fontWeight: 800,
                color: TEST_TEXT,
                lineHeight: 1.25,
              }}
            >
              {meta?.title ?? 'Bài kiểm tra'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: TEST_MUTED, mt: 0.5 }}>
              {meta?.scope === 'final'
                ? 'Kiểm tra tổng hợp toàn khóa học'
                : meta?.chapterTitle
                  ? meta.chapterTitle
                  : 'Kiểm tra cuối chương'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
          <Chip
            icon={<AccessTimeRoundedIcon sx={{ fontSize: '16px !important' }} />}
            label={formatDurationMinutes(meta?.timeLimitMinutes)}
            size="small"
            sx={{ fontWeight: 600, bgcolor: alpha(TEST_PRIMARY, 0.06), color: TEST_PRIMARY }}
          />
          <Chip
            icon={<QuizRoundedIcon sx={{ fontSize: '16px !important' }} />}
            label={`${meta?.totalQuestions ?? 0} câu`}
            size="small"
            sx={{ fontWeight: 600, bgcolor: alpha('#7C3AED', 0.08), color: '#7C3AED' }}
          />
          <Chip
            icon={<ReplayRoundedIcon sx={{ fontSize: '16px !important' }} />}
            label={`Còn ${meta?.remainingAttempts ?? 0} lượt`}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {meta?.isDemo && (
            <Chip
              icon={<InfoOutlinedIcon sx={{ fontSize: '16px !important' }} />}
              label="Demo UI"
              size="small"
              sx={{ fontWeight: 600, bgcolor: alpha('#EA580C', 0.08), color: '#EA580C' }}
            />
          )}
        </Box>

        <Box
          sx={{
            bgcolor: alpha(TEST_PRIMARY, 0.04),
            borderRadius: '12px',
            border: `1px solid ${alpha(TEST_PRIMARY, 0.1)}`,
            px: 2,
            py: 1.75,
            mb: 3,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEST_TEXT, mb: 1 }}>
            Quy định làm bài
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
            {rules.map((rule) => (
              <Typography
                key={rule}
                component="li"
                sx={{ fontSize: 13.5, color: TEST_MUTED, lineHeight: 1.65, mb: 0.5 }}
              >
                {rule}
              </Typography>
            ))}
          </Box>
        </Box>

        {!canStart && (
          <Typography sx={{ fontSize: 14, color: '#DC2626', fontWeight: 600, mb: 2 }}>
            Bạn đã hết lượt làm bài kiểm tra.
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
          <AppButton variant="outlined" onClick={onBack}>
            Quay lại học
          </AppButton>
          <AppButton loading={loading} disabled={!canStart} onClick={onStart}>
            Bắt đầu làm bài
          </AppButton>
        </Box>
      </Box>
    </Box>
  );
}
