import { Box, Typography } from '@mui/material';
import { TEST_SKILL_LISTENING } from '@/features/mentor/utils/mentorTestContentUtils';
import TestQuestionCard from './TestQuestionCard';
import { TEST_DIVIDER, TEST_MUTED } from './testTheme';

export default function TestQuestionGroup({
  group,
  skillType,
  answers = {},
  onAnswerChange,
  hideTitle = false,
}) {
  const audioUrl = group?.audioUrl ?? null;

  return (
    <Box>
      {!hideTitle && group?.displayName && (
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEST_MUTED, mb: 1.25 }}>
          {group.displayName}
        </Typography>
      )}

      {skillType === TEST_SKILL_LISTENING && audioUrl && (
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: '14px',
            border: `1px solid ${TEST_DIVIDER}`,
            px: 2,
            py: 1.5,
            mb: 1.5,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEST_MUTED, mb: 1 }}>
            Audio nhóm câu hỏi
          </Typography>
          <Box
            component="audio"
            controls
            preload="metadata"
            src={audioUrl}
            sx={{ width: '100%' }}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {(group?.questions ?? []).map((question) => (
          <TestQuestionCard
            key={question.tempId}
            question={question}
            selectedOptionTempIds={answers[question.tempId] ?? []}
            onChange={onAnswerChange}
          />
        ))}
      </Box>
    </Box>
  );
}
