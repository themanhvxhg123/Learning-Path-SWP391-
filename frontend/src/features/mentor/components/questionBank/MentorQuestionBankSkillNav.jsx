/**
 * Panel CTA bên trái — chuyển giữa 3 phần Nghe / Đọc / Trắc nghiệm.
 */
import { Box, Typography, alpha } from '@mui/material';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import { MUTED, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { BUILDER_PANEL_SX } from '@/features/mentor/components/course/mentorCourseContentStyles';
import {
  getActiveFilledTestQuestions,
  getFilledTestQuestions,
  getNonEmptyQuestionBankSections,
  getSectionsBySkill,
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
} from '@/features/mentor/utils/mentorTestContentUtils';

const SKILL_NAV_ITEMS = [
  {
    skill: TEST_SKILL_LISTENING,
    label: TEST_SKILL_LABELS[TEST_SKILL_LISTENING],
    icon: HeadphonesRoundedIcon,
  },
  {
    skill: TEST_SKILL_READING,
    label: TEST_SKILL_LABELS[TEST_SKILL_READING],
    icon: MenuBookRoundedIcon,
  },
  {
    skill: TEST_SKILL_WRITING,
    label: TEST_SKILL_LABELS[TEST_SKILL_WRITING],
    icon: EditNoteRoundedIcon,
  },
];

function SkillNavButton({
  label,
  icon: Icon,
  color,
  sectionCount = 0,
  sectionUnit = 'bài',
  questionCount = 0,
  activeQuestionCount = 0,
  showActiveCounts = false,
  showSectionCount = true,
  selected = false,
  disabled = false,
  hasError = false,
  onClick,
}) {
  const metaText = !showSectionCount
    ? showActiveCounts && questionCount !== activeQuestionCount
      ? `${activeQuestionCount}/${questionCount} câu đang dùng`
      : `${questionCount} câu hỏi`
    : showActiveCounts && questionCount !== activeQuestionCount
      ? `${sectionCount} ${sectionUnit} · ${activeQuestionCount}/${questionCount} câu đang dùng`
      : `${sectionCount} ${sectionUnit} · ${questionCount} câu hỏi`;
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.85,
        width: '100%',
        textAlign: 'left',
        border: selected
          ? `1px solid ${alpha(color, 0.35)}`
          : hasError
            ? '1px solid rgba(220,38,38,0.35)'
            : '1px solid transparent',
        borderRadius: '12px',
        bgcolor: selected ? alpha(color, 0.1) : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        font: 'inherit',
        px: 1,
        py: 0.85,
        transition: 'background-color 0.15s, border-color 0.15s',
        opacity: disabled ? 0.55 : 1,
        '&:hover': disabled
          ? undefined
          : {
              bgcolor: selected ? alpha(color, 0.14) : 'rgba(15,23,42,0.04)',
            },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '10px',
          bgcolor: selected ? '#fff' : alpha(color, 0.1),
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 17, color }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: selected ? 700 : 600,
            color: selected ? color : TEXT,
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.15, lineHeight: 1.35 }}>
          {metaText}
        </Typography>
      </Box>
    </Box>
  );
}

export default function MentorQuestionBankSkillNav({
  sections = [],
  activeSkill = TEST_SKILL_READING,
  disabled = false,
  sectionErrors = {},
  showActiveCounts = false,
  onSkillChange,
}) {
  const baiCountBySkill = SKILL_NAV_ITEMS.reduce((acc, { skill }) => {
    acc[skill] = getNonEmptyQuestionBankSections(getSectionsBySkill(sections, skill)).length;
    return acc;
  }, {});

  const countBySkill = SKILL_NAV_ITEMS.reduce((acc, { skill }) => {
    acc[skill] = getSectionsBySkill(sections, skill).reduce(
      (sum, section) => sum + getFilledTestQuestions(section?.Questions).length,
      0,
    );
    return acc;
  }, {});

  const activeCountBySkill = SKILL_NAV_ITEMS.reduce((acc, { skill }) => {
    acc[skill] = getSectionsBySkill(sections, skill).reduce(
      (sum, section) => sum + getActiveFilledTestQuestions(section?.Questions).length,
      0,
    );
    return acc;
  }, {});

  const errorBySkill = SKILL_NAV_ITEMS.reduce((acc, { skill }) => {
    acc[skill] = getSectionsBySkill(sections, skill).some((section) =>
      Boolean(sectionErrors[section.tempId]),
    );
    return acc;
  }, {});

  return (
    <Box
      sx={{
        ...BUILDER_PANEL_SX,
        p: 1.25,
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          color: MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          mb: 1,
          px: 0.5,
        }}
      >
        Kỹ năng
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
        {SKILL_NAV_ITEMS.map(({ skill, label, icon }) => {
          const theme = TEST_SKILL_CHIP_COLORS[skill];
          return (
            <SkillNavButton
              key={skill}
              label={label}
              icon={icon}
              color={theme.color}
              sectionCount={baiCountBySkill[skill]}
              questionCount={countBySkill[skill]}
              activeQuestionCount={activeCountBySkill[skill]}
              showActiveCounts={showActiveCounts}
              showSectionCount={skill !== TEST_SKILL_WRITING}
              selected={activeSkill === skill}
              disabled={disabled}
              hasError={errorBySkill[skill]}
              onClick={() => onSkillChange?.(skill)}
            />
          );
        })}
      </Box>
    </Box>
  );
}
