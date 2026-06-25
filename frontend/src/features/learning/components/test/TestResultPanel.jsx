import {
  Box,
  Chip,
  Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import AppButton from '@/shared/ui/AppButton';
import {
  TEST_DIVIDER,
  TEST_ERROR,
  TEST_MUTED,
  TEST_PRIMARY,
  TEST_SUCCESS,
  TEST_TEXT,
  formatTimeSpent,
} from './testTheme';

function formatScoreValue(score = 0) {
  const value = Number(score) || 0;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function TestResultPanel({
  meta,
  result,
  onRetry,
  onBack,
}) {
  const passed = Boolean(result?.passed);
  const maxScore = result?.maxScore ?? 100;
  const displayScore = formatScoreValue(result?.score ?? 0);
  const passingScore = result?.passingScore ?? meta?.passingScore ?? 70;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: '16px',
        border: `1px solid ${TEST_DIVIDER}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 2.5, md: 3.5 },
          py: { xs: 3, md: 4 },
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: 2 }}>
          {passed ? (
            <CheckRoundedIcon sx={{ fontSize: 48, color: TEST_SUCCESS }} />
          ) : (
            <CloseRoundedIcon sx={{ fontSize: 48, color: TEST_ERROR }} />
          )}
        </Box>

        <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, color: TEST_TEXT, mb: 0.75 }}>
          {passed ? 'Chúc mừng! Bạn đã đạt' : 'Chưa đạt yêu cầu'}
        </Typography>
        <Typography sx={{ fontSize: 14, color: TEST_MUTED, mb: 2.5 }}>
          {meta?.title ?? 'Bài kiểm tra'}
        </Typography>

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 0.75,
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 36, fontWeight: 800, color: TEST_PRIMARY, lineHeight: 1 }}>
            {displayScore}
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: TEST_PRIMARY }}>
            /{maxScore}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
          <Chip
            label={`${result?.correctCount ?? 0}/${result?.totalQuestions ?? 0} câu đúng`}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`Điểm đạt: ${passingScore}/${maxScore}`}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`Thời gian: ${formatTimeSpent(result?.timeSpentSeconds)}`}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {result?.canRetry && (
            <Chip
              icon={<ReplayRoundedIcon sx={{ fontSize: '16px !important' }} />}
              label={`Còn ${result?.remainingAttempts ?? 0} lượt`}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
          <AppButton variant="outlined" onClick={onBack}>
            Quay lại học
          </AppButton>
          {result?.canRetry && (
            <AppButton onClick={onRetry}>
              Làm lại
            </AppButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}
