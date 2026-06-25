import { Box, Chip, Typography, alpha } from '@mui/material';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import {
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
} from '@/features/mentor/utils/mentorTestContentUtils';
import TestQuestionGroup from './TestQuestionGroup';
import TestQuestionCard from './TestQuestionCard';
import { TEST_DIVIDER, TEST_MUTED, TEST_TEXT } from './testTheme';

const SKILL_ICONS = {
  [TEST_SKILL_LISTENING]: HeadphonesRoundedIcon,
  [TEST_SKILL_READING]: MenuBookRoundedIcon,
  [TEST_SKILL_WRITING]: EditNoteRoundedIcon,
};

export default function TestSkillSection({
  section,
  answers = {},
  onAnswerChange,
  hideHeader = false,
  activeGroup = null,
}) {
  const colors = TEST_SKILL_CHIP_COLORS[section.skillType] ?? TEST_SKILL_CHIP_COLORS[TEST_SKILL_READING];
  const Icon = SKILL_ICONS[section.skillType] ?? MenuBookRoundedIcon;

  if (activeGroup) {
    return (
      <Box>
        {hideHeader && section.description && (
          <Typography sx={{ fontSize: 13.5, color: TEST_MUTED, mb: 1.5, lineHeight: 1.6 }}>
            {section.description}
          </Typography>
        )}

        <TestQuestionGroup
          group={activeGroup}
          skillType={section.skillType}
          answers={answers}
          onAnswerChange={onAnswerChange}
          hideTitle
        />
      </Box>
    );
  }

  const audioUrl = section.audioUrl ?? section.questions?.find((q) => q.audioUrl)?.audioUrl ?? null;

  return (
    <Box>
      {!hideHeader && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            mb: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: colors.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ fontSize: 20, color: colors.color }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: TEST_TEXT }}>
                {section.displayName}
              </Typography>
              {section.description && (
                <Typography sx={{ fontSize: 13, color: TEST_MUTED }}>
                  {section.description}
                </Typography>
              )}
            </Box>
          </Box>
          <Chip
            label={`${section.questions?.length ?? 0} câu`}
            size="small"
            sx={{
              fontWeight: 600,
              bgcolor: colors.bg,
              color: colors.color,
            }}
          />
        </Box>
      )}

      {hideHeader && section.description && (
        <Typography sx={{ fontSize: 13.5, color: TEST_MUTED, mb: 1.5, lineHeight: 1.6 }}>
          {section.description}
        </Typography>
      )}

      {section.skillType === TEST_SKILL_LISTENING && audioUrl && (
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
            Audio phần nghe
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
        {(section.questions ?? []).map((question) => (
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
