/**
 * MentorQuestionBankBuilderPanel — cột giữa workspace (mock section cục bộ).
 */
import { Box, Typography, alpha } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import MentorTestSectionCard from '@/features/mentor/components/course/MentorTestSectionCard';
import { CREATE_CARD_SX, MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  SECTION_USE_FOR_TEST_FILTER,
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
} from '@/features/mentor/utils/mentorTestContentUtils';

const SECTION_USE_FOR_TEST_FILTER_OPTIONS = [
  { value: SECTION_USE_FOR_TEST_FILTER.ALL, label: 'Tất cả' },
  { value: SECTION_USE_FOR_TEST_FILTER.YES, label: 'Dùng trong test' },
  { value: SECTION_USE_FOR_TEST_FILTER.NO, label: 'Không dùng trong test' },
];

const TEST_SKILL_BY_TYPE_ID = {
  1: TEST_SKILL_LISTENING,
  2: TEST_SKILL_READING,
  3: TEST_SKILL_VOCABULARY,
};

function BaiTab({ label, selected, accentColor, hasContent = false, onClick }) {
  const StatusIcon = hasContent ? CheckCircleOutlineRoundedIcon : RadioButtonUncheckedRoundedIcon;
  const statusColor = hasContent ? '#047857' : alpha(MUTED, 0.85);

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.25,
        py: 0.55,
        borderRadius: '999px',
        border: selected ? `1px solid ${alpha(accentColor, 0.4)}` : '1px solid rgba(15,23,42,0.1)',
        bgcolor: selected ? alpha(accentColor, 0.1) : '#fff',
        color: selected ? accentColor : TEXT,
        fontSize: 12,
        fontWeight: selected ? 700 : 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        maxWidth: { xs: '100%', sm: 220 },
        overflow: 'hidden',
        '&:hover': { bgcolor: selected ? alpha(accentColor, 0.14) : 'rgba(15,23,42,0.04)' },
      }}
    >
      <StatusIcon sx={{ fontSize: 15, color: statusColor, flexShrink: 0 }} />
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {label}
      </Box>
    </Box>
  );
}

function SectionUseForTestFilterRow({ value, setSectionIsUseForTest, filterSectionCounts = {} }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
      {SECTION_USE_FOR_TEST_FILTER_OPTIONS.map((option) => {
        const selected = value === option.value;
        const count = filterSectionCounts[option.value] ?? 0;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            onClick={() => setSectionIsUseForTest(option.value)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              height: 32,
              px: 1.1,
              borderRadius: '999px',
              border: `1px solid ${selected ? alpha(PRIMARY, 0.35) : alpha('#0F172A', 0.08)}`,
              bgcolor: selected ? alpha(PRIMARY, 0.1) : '#fff',
              color: selected ? PRIMARY : TEXT,
              fontSize: 12,
              fontWeight: selected ? 700 : 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <Box component="span">{option.label}</Box>
            <Box
              component="span"
              sx={{
                minWidth: 18,
                height: 18,
                px: 0.5,
                borderRadius: '999px',
                bgcolor: selected ? alpha(PRIMARY, 0.16) : alpha('#0F172A', 0.06),
                color: selected ? PRIMARY : MUTED,
                fontSize: 11,
                fontWeight: 700,
                lineHeight: '18px',
                textAlign: 'center',
              }}
            >
              {count}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default function MentorQuestionBankBuilderPanel({
  sectionsPath = [],
  filterSectionCounts = {},
  selectedSectionId,
  setSelectedSectionId,
  sectionIsUseForTest,
  setSectionIsUseForTest,
  setSectionsPath,
  selectedSkillId,
}) {
  const testSkill = TEST_SKILL_BY_TYPE_ID[Number(selectedSkillId)] ?? TEST_SKILL_READING;
  const accentColor = TEST_SKILL_CHIP_COLORS[testSkill]?.color ?? PRIMARY;

  const handleAddSection = () => {
    const newSection = {
      TypeId: selectedSkillId,
      SectionId: Math.floor(Math.random() * (99999 - 253 + 1)) + 253,
      SectionName: '',
      SectionTitle: '',
      Questions: [],
      IsUseForTest: false,
      isUseForTest: false,
      isDraftSection: true,
    };
    setSectionsPath((prev) => [...prev, newSection]);
    setSelectedSectionId(newSection.SectionId);
  };

  const handleSectionChange = (sectionId, patch) => {
    setSectionsPath((prev) =>
      prev.map((section) =>
        Number(section.SectionId) === Number(sectionId) ? { ...section, ...patch } : section,
      ),
    );
  };

  const selectedSection = sectionsPath.find(
    (section) => Number(section.SectionId) === Number(selectedSectionId),
  );

  return (
    <Box id="question-bank-builder-root" sx={{ minWidth: 0, width: '100%' }}>
      <Box sx={{ ...CREATE_CARD_SX, mb: { xs: 2, lg: 0 } }}>
        <Box id="qb-questions" sx={{ scrollMarginTop: 24 }}>
          <SectionUseForTestFilterRow
            value={sectionIsUseForTest}
            setSectionIsUseForTest={setSectionIsUseForTest}
            filterSectionCounts={filterSectionCounts}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mb: 2 }}>
            {sectionsPath?.map((section, index) => (
              <BaiTab
                key={section.SectionId ?? index}
                label={`Bài ${index + 1}`}
                hasContent={section?.hasContent}
                selected={Number(selectedSectionId) === Number(section.SectionId)}
                accentColor={accentColor}
                onClick={() => setSelectedSectionId(section.SectionId)}
              />
            ))}
            <Box
              component="button"
              type="button"
              onClick={handleAddSection}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.35,
                px: 1,
                py: 0.55,
                borderRadius: '999px',
                border: '1px dashed rgba(15,23,42,0.18)',
                bgcolor: 'transparent',
                color: MUTED,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(15,23,42,0.04)', color: TEXT },
              }}
            >
              <AddRoundedIcon sx={{ fontSize: 15 }} />
              Thêm bài
            </Box>
            <Typography sx={{ fontSize: 11, color: MUTED, ml: { xs: 0, sm: 0.25 } }}>
              {sectionsPath?.length ?? 0} bài
            </Typography>
          </Box>

          {selectedSection ? (
            <Box sx={{ scrollMarginTop: 24, minWidth: 0 }}>
              <MentorTestSectionCard
                sections={selectedSection}
                onSectionChange={handleSectionChange}
              />
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
