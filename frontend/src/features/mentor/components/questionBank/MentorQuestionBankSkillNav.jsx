/**
 * =============================================================================
 * MentorQuestionBankSkillNav — Tabbar kỹ năng (cột trái workspace)
 * =============================================================================
 *
 * MỤC ĐÍCH: Chọn kỹ năng Listening / Reading / Vocabulary.
 * LUỒNG: Click kỹ năng → onSkillChange(skill) → parent đổi activeSkill.
 *
 * Tabbar kỹ năng — cột trái workspace question bank.
 */import { Box, Typography, alpha } from '@mui/material';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import { BUILDER_PANEL_SX } from '@/features/mentor/components/course/mentorCourseContentStyles';
import { MUTED, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { HEADER_HEIGHT } from '@/shared/layout/MainLayout';
import {
  getSectionsBySkill,
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  QUESTION_BANK_SKILLS,
} from '@/features/mentor/utils/mentorTestContentUtils';
import { getSkillTestUsageLabel } from '@/features/mentor/utils/mentorChapterQuizConfigUtils';

const SKILL_NAV_ITEMS = QUESTION_BANK_SKILLS.map((skill, index) => ({
  skillTypeId: Number(index + 1),
  skill,
  label: TEST_SKILL_LABELS[skill],
  icon: skill === TEST_SKILL_LISTENING
    ? HeadphonesRoundedIcon
    : skill === TEST_SKILL_READING
      ? MenuBookRoundedIcon
      : EditNoteRoundedIcon,
}));

function SkillNavButton({
  skill,
  numberQuestionInSkill,
  numberSectionInSkill,
  label,
  icon: Icon,
  color,
  sectionUseForTest = [],
  selected = false,
  disabled = false,
  hasError = false,
  onClick,
}) {
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
        '&:hover': disabled ? undefined : { bgcolor: selected ? alpha(color, 0.14) : 'rgba(15,23,42,0.04)' },
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
        <Typography sx={{ fontSize: 13, fontWeight: selected ? 700 : 600, color: selected ? color : TEXT, lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.15, lineHeight: 1.35 }}>
          {numberSectionInSkill ?? 0} section : {numberQuestionInSkill} câu
        </Typography>
        {sectionUseForTest ? (
          <Typography sx={{ fontSize: 11, color: '#047857', mt: 0.2, lineHeight: 1.35, fontWeight: 600 }}>
            {sectionUseForTest[0]?.[skill]?.length} section dùng trong TEST
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

export default function MentorQuestionBankSkillNav({
  pathId,
  statsForSkillNav = [],
  sections = [],
  disabled = false,
  sectionErrors = {},
  sectionUseForTest = null,
  selectedSkillId,
  setSelectedSkillId,
}) {

  const normalizationSkill = (skill) => {
    if (skill.toLowerCase() === 'listening') return 'listeningSectionGroups';
    if (skill.toLowerCase() === 'reading') return 'readingSectionGroups';
    if (skill.toLowerCase() === 'vocabulary') return 'vocabularySectionGroups';
    return ''
  }

  const countSectionInSkill = (statsForSkillNav, pathId, skill) => {
    skill = normalizationSkill(skill)
    return statsForSkillNav.filter((stat) => Number(stat.PathId) === Number(pathId))[0]?.[skill]?.length
  }

  const countQuestionInSkill = (statsForSkillNav, pathId, skill) => {
    return statsForSkillNav.filter((stat) => Number(stat.PathId) === Number(pathId))[0]?.questionCountBySkill?.[skill]
  }

  const errorBySkill = SKILL_NAV_ITEMS.reduce((acc, { skill }) => {
    acc[skill] = getSectionsBySkill(sections, skill).some((section) =>
      Boolean(sectionErrors[section.tempId]),
    );
    return acc;
  }, {});

  return (
    <Box
      sx={{
        width: { xs: '100%', lg: 200 },
        flexShrink: 0,
        alignSelf: 'flex-start',
        position: { lg: 'sticky' },
        top: { lg: HEADER_HEIGHT + 16 },
        zIndex: 2,
      }}
    >
      <Box sx={{ ...BUILDER_PANEL_SX, p: 1.25 }}>
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
          {SKILL_NAV_ITEMS.map(({ skillTypeId, skill, label, icon }) => {
            const theme = TEST_SKILL_CHIP_COLORS[skill];
            const numberSectionInSkill = countSectionInSkill(statsForSkillNav, pathId, skill)
            const numberQuestionInSkill = countQuestionInSkill(statsForSkillNav, pathId, skill)
            return (
              <SkillNavButton
                key={skill}
                skill={skill}
                pathId={pathId}
                label={label}
                icon={icon}
                color={theme.color}
                numberSectionInSkill={numberSectionInSkill}
                numberQuestionInSkill={numberQuestionInSkill}
                sectionUseForTest={sectionUseForTest}
                selected={Number(selectedSkillId) === Number(skillTypeId)}
                disabled={disabled}
                hasError={errorBySkill[skill]}
                onClick={() => setSelectedSkillId(skillTypeId)}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
