import { Box, Typography, alpha } from '@mui/material';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
  TEST_SKILLS,
} from '@/features/mentor/utils/mentorTestContentUtils';
import { TEST_DIVIDER, TEST_MUTED, TEST_PRIMARY, TEST_TEXT } from './testTheme';

const SKILL_ICONS = {
  [TEST_SKILL_LISTENING]: HeadphonesRoundedIcon,
  [TEST_SKILL_READING]: MenuBookRoundedIcon,
  [TEST_SKILL_WRITING]: EditNoteRoundedIcon,
};

const SKILL_SHORT_LABELS = {
  [TEST_SKILL_LISTENING]: 'Nghe',
  [TEST_SKILL_READING]: 'Đọc',
  [TEST_SKILL_WRITING]: 'Từ vựng / Ngữ pháp',
};

function getSectionProgress(section, answers = {}) {
  const questions = section?.questions ?? [];
  const total = questions.length;
  const answered = questions.filter((q) => (answers[q.tempId] ?? []).length > 0).length;
  return { answered, total };
}

export default function TestSkillNav({
  sections = [],
  activeSkillType,
  answers = {},
  onSelect,
}) {
  const sectionMap = Object.fromEntries(
    sections.map((section) => [section.skillType, section]),
  );

  const availableSkills = TEST_SKILLS.filter((skill) => sectionMap[skill]);

  if (!availableSkills.length) return null;

  return (
    <Box
      component="nav"
      aria-label="Chuyển phần kiểm tra"
      sx={{
        width: { xs: '100%', md: 220 },
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          bgcolor: '#fff',
          borderRadius: '16px',
          border: `1px solid ${TEST_DIVIDER}`,
          overflow: 'hidden',
          position: { md: 'sticky' },
          top: { md: 16 },
        }}
      >
        <Box sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${TEST_DIVIDER}` }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: TEST_MUTED, letterSpacing: 0.4 }}>
            PHẦN KIỂM TRA
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'row', md: 'column' },
            gap: { xs: 1, md: 0.75 },
            p: { xs: 1.25, md: 1.5 },
            overflowX: { xs: 'auto', md: 'visible' },
          }}
        >
          {availableSkills.map((skillType) => {
            const section = sectionMap[skillType];
            const colors = TEST_SKILL_CHIP_COLORS[skillType];
            const Icon = SKILL_ICONS[skillType];
            const isActive = activeSkillType === skillType;
            const { answered, total } = getSectionProgress(section, answers);
            const isComplete = total > 0 && answered === total;

            return (
              <Box
                key={skillType}
                component="button"
                type="button"
                onClick={() => onSelect(skillType)}
                aria-current={isActive ? 'true' : undefined}
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'center', md: 'flex-start' },
                  gap: 1.25,
                  width: { xs: 'auto', md: '100%' },
                  minWidth: { xs: 140, md: 'auto' },
                  px: 1.5,
                  py: 1.25,
                  border: `1.5px solid ${isActive ? colors.color : 'transparent'}`,
                  borderRadius: '12px',
                  bgcolor: isActive ? colors.bg : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s, border-color 0.15s',
                  flexShrink: { xs: 0, md: 1 },
                  '&:hover': {
                    bgcolor: isActive ? colors.bg : alpha(colors.color, 0.06),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: isActive ? alpha(colors.color, 0.16) : colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 20, color: colors.color }} />
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: { xs: 13, md: 14 },
                      fontWeight: isActive ? 800 : 700,
                      color: isActive ? colors.color : TEST_TEXT,
                      lineHeight: 1.3,
                    }}
                  >
                    {SKILL_SHORT_LABELS[skillType] ?? TEST_SKILL_LABELS[skillType]}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: TEST_MUTED, mt: 0.25 }}>
                    {answered}/{total} câu
                  </Typography>
                </Box>

                {isComplete && (
                  <CheckCircleRoundedIcon
                    sx={{
                      fontSize: 18,
                      color: TEST_PRIMARY,
                      flexShrink: 0,
                      alignSelf: { xs: 'center', md: 'flex-start' },
                      mt: { md: 0.25 },
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export { SKILL_SHORT_LABELS };
