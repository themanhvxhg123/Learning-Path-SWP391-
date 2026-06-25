import { Box, LinearProgress, Typography, alpha } from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import AppButton from '@/shared/ui/AppButton';
import { formatTimer } from '@/features/learning/utils/courseTestPaperUtils';
import {
  TEST_DIVIDER,
  TEST_ERROR,
  TEST_MUTED,
  TEST_PRIMARY,
  TEST_TEXT,
  TEST_WARNING,
} from './testTheme';

const TIMER_STATE = {
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

function getTimerState(remainingSeconds, totalSeconds) {
  const total = Math.max(1, Number(totalSeconds) || 1);
  const ratio = Math.max(0, Number(remainingSeconds) || 0) / total;

  if (ratio <= 0.2) return TIMER_STATE.CRITICAL;
  if (ratio <= 0.5) return TIMER_STATE.WARNING;
  return TIMER_STATE.NORMAL;
}

function getTimerStyles(state) {
  if (state === TIMER_STATE.CRITICAL) {
    return {
      color: TEST_ERROR,
      bgcolor: alpha(TEST_ERROR, 0.1),
      fontWeight: 800,
    };
  }
  if (state === TIMER_STATE.WARNING) {
    return {
      color: TEST_WARNING,
      bgcolor: alpha(TEST_WARNING, 0.12),
      fontWeight: 800,
    };
  }
  return {
    color: TEST_PRIMARY,
    bgcolor: alpha(TEST_PRIMARY, 0.08),
    fontWeight: 700,
  };
}

export default function TestHeader({
  meta,
  answeredCount = 0,
  totalQuestions = 0,
  remainingSeconds = 0,
  totalSeconds = 0,
  sticky = true,
  onSubmit,
  submitting = false,
}) {
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const resolvedTotalSeconds = totalSeconds || (meta?.timeLimitMinutes ?? 0) * 60 || 1;
  const timerState = getTimerState(remainingSeconds, resolvedTotalSeconds);
  const timerStyles = getTimerStyles(timerState);
  const showTimeWarning = timerState === TIMER_STATE.CRITICAL;

  return (
    <Box
      sx={{
        position: sticky ? 'sticky' : 'static',
        top: 0,
        zIndex: 10,
        bgcolor: '#fff',
        borderRadius: '16px',
        border: `1px solid ${TEST_DIVIDER}`,
        mb: 2.5,
        overflow: 'hidden',
        boxShadow: sticky ? '0 4px 24px rgba(15,23,42,0.06)' : 'none',
      }}
    >
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.75 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: { xs: 1, md: 2 },
            mb: showTimeWarning ? 1 : 1.25,
          }}
        >
          <Box sx={{ minWidth: 0, justifySelf: 'start' }}>
            <Typography
              sx={{
                fontSize: { xs: 16, md: 18 },
                fontWeight: 800,
                color: TEST_TEXT,
                lineHeight: 1.3,
              }}
              noWrap
            >
              {meta?.title ?? 'Bài kiểm tra'}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: TEST_MUTED, mt: 0.25 }}>
              Đã trả lời {answeredCount}/{totalQuestions} câu
            </Typography>
          </Box>

          <Box
            sx={{
              justifySelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 0.5,
              borderRadius: '10px',
              bgcolor: timerStyles.bgcolor || 'transparent',
              color: timerStyles.color,
            }}
          >
            <AccessTimeRoundedIcon sx={{ fontSize: { xs: 18, md: 20 } }} />
            <Typography
              component="span"
              sx={{
                fontSize: { xs: 20, md: 22 },
                fontWeight: timerStyles.fontWeight,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                letterSpacing: 0.25,
              }}
            >
              {formatTimer(remainingSeconds)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', justifySelf: 'end' }}>
            {onSubmit && (
              <AppButton
                size="small"
                loading={submitting}
                onClick={onSubmit}
                sx={{
                  minWidth: { xs: 88, sm: 108 },
                  height: 36,
                  px: 2,
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: 'none',
                }}
              >
                Nộp bài
              </AppButton>
            )}
          </Box>
        </Box>

        {showTimeWarning && (
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              color: TEST_ERROR,
              textAlign: 'center',
              mb: 1.25,
            }}
          >
            Lưu ý bạn sắp hết thời gian làm bài
          </Typography>
        )}

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 999,
            bgcolor: alpha(TEST_PRIMARY, 0.08),
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              bgcolor: TEST_PRIMARY,
            },
          }}
        />
      </Box>
    </Box>
  );
}
