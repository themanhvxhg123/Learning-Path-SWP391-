/**
 * MentorQuestionBankBuilderPanel — cột giữa workspace (mock section cục bộ).
 */
import { useMemo, useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import MentorTestSectionCard from '@/features/mentor/components/course/MentorTestSectionCard';
import { CREATE_CARD_SX, MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  SCORING_MODE_AUTO,
  SECTION_USE_FOR_TEST_FILTER,
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
} from '@/features/mentor/utils/mentorTestContentUtils';

const DEMO_SECTION_TABS = [
  { id: 'demo-1', label: 'Bài 1', hasContent: true, skill: TEST_SKILL_LISTENING },
  { id: 'demo-2', label: 'Bài 2', hasContent: true, skill: TEST_SKILL_READING },
];

const DEMO_FILTER_COUNTS = { all: 2, inTest: 1, notInTest: 1 };

/** Mock section + câu hỏi — chỉ dùng trên UI builder, chưa gọi API. */
function createMockSectionsByTab() {
  return {
    'demo-1': {
      tempId: 'section_mock_listening',
      SectionId: 9001,
      DisplayName: 'Bài nghe 1',
      SectionTitle: 'Office email — short dialogue',
      SkillType: TEST_SKILL_LISTENING,
      typeId: 1,
      Description: '',
      isUseForTest: true,
      AudioUrl: 'https://example.com/audio/demo-listening.mp3',
      Questions: [
        {
          tempId: 'question_mock_1',
          QuestionId: 9101,
          SkillType: TEST_SKILL_LISTENING,
          QuestionText: 'What does the speaker ask the listener to do?',
          isActive: true,
          isUseForTest: true,
          Options: [
            { tempId: 'choice_mock_1', ChoiceId: 9201, OptionText: 'Reply by Friday', IsCorrect: true },
            { tempId: 'choice_mock_2', ChoiceId: 9202, OptionText: 'Cancel the meeting', IsCorrect: false },
            { tempId: 'choice_mock_3', ChoiceId: 9203, OptionText: 'Book a flight', IsCorrect: false },
            { tempId: 'choice_mock_4', ChoiceId: 9204, OptionText: 'Send an invoice', IsCorrect: false },
          ],
        },
        {
          tempId: 'question_mock_2',
          QuestionId: 9102,
          SkillType: TEST_SKILL_LISTENING,
          QuestionText: 'When is the follow-up meeting scheduled?',
          isActive: true,
          isUseForTest: true,
          Options: [
            { tempId: 'choice_mock_5', ChoiceId: 9205, OptionText: 'Monday at 9 AM', IsCorrect: false },
            { tempId: 'choice_mock_6', ChoiceId: 9206, OptionText: 'Wednesday at 10 AM', IsCorrect: true },
            { tempId: 'choice_mock_7', ChoiceId: 9207, OptionText: 'Friday at 4 PM', IsCorrect: false },
            { tempId: 'choice_mock_8', ChoiceId: 9208, OptionText: 'Next month', IsCorrect: false },
          ],
        },
      ],
    },
    'demo-2': {
      tempId: 'section_mock_reading',
      SectionId: 9002,
      DisplayName: 'Bài đọc 1',
      SectionTitle: 'Remote work policy (excerpt)',
      SkillType: TEST_SKILL_READING,
      typeId: 2,
      Description: '<p>Employees may work remotely up to three days per week with manager approval.</p>',
      isUseForTest: true,
      MaterialUrl: '',
      ReadingSourceType: 'COMPOSE',
      Questions: [
        {
          tempId: 'question_mock_3',
          QuestionId: 9103,
          SkillType: TEST_SKILL_READING,
          QuestionText: 'How many remote days per week are allowed?',
          isActive: true,
          isUseForTest: true,
          Options: [
            { tempId: 'choice_mock_9', ChoiceId: 9209, OptionText: 'One day', IsCorrect: false },
            { tempId: 'choice_mock_10', ChoiceId: 9210, OptionText: 'Up to three days', IsCorrect: true },
            { tempId: 'choice_mock_11', ChoiceId: 9211, OptionText: 'Every day', IsCorrect: false },
            { tempId: 'choice_mock_12', ChoiceId: 9212, OptionText: 'Not mentioned', IsCorrect: false },
          ],
        },
      ],
    },
  };
}

const SECTION_USE_FOR_TEST_FILTER_OPTIONS = [
  { value: SECTION_USE_FOR_TEST_FILTER.ALL, label: 'Tất cả', countKey: 'all' },
  { value: SECTION_USE_FOR_TEST_FILTER.IN_TEST, label: 'Dùng trong test', countKey: 'inTest' },
  { value: SECTION_USE_FOR_TEST_FILTER.NOT_IN_TEST, label: 'Không dùng trong test', countKey: 'notInTest' },
];

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

function SectionUseForTestFilterRow({ value, counts, onChange }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
      {SECTION_USE_FOR_TEST_FILTER_OPTIONS.map((option) => {
        const selected = value === option.value;
        const count = counts?.[option.countKey] ?? 0;

        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            onClick={() => onChange(option.value)}
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

export default function MentorQuestionBankBuilderPanel({ sectionsPath = [] }) {
  const [sectionUseForTestFilter, setSectionUseForTestFilter] = useState(SECTION_USE_FOR_TEST_FILTER.ALL);
  const [activeTabId, setActiveTabId] = useState(DEMO_SECTION_TABS[0].id);
  const [sectionsByTab, setSectionsByTab] = useState(createMockSectionsByTab);

  const activeTab = DEMO_SECTION_TABS.find((tab) => tab.id === activeTabId) ?? DEMO_SECTION_TABS[0];
  const activeSection = sectionsByTab[activeTabId] ?? null;
  const accentColor =
    TEST_SKILL_CHIP_COLORS[activeTab.skill]?.color
    ?? TEST_SKILL_CHIP_COLORS[TEST_SKILL_LISTENING]?.color
    ?? PRIMARY;

  const allMockSections = useMemo(() => Object.values(sectionsByTab), [sectionsByTab]);
  const questionCountAll = useMemo(
    () => allMockSections.reduce((sum, section) => sum + (section.Questions?.length ?? 0), 0),
    [allMockSections],
  );

  const handleSectionChange = (nextSection) => {
    setSectionsByTab((prev) => ({
      ...prev,
      [activeTabId]: nextSection,
    }));
  };

  return (
    <Box id="question-bank-builder-root" sx={{ minWidth: 0, width: '100%' }}>
      <Box sx={{ ...CREATE_CARD_SX, mb: { xs: 2, lg: 0 } }}>
        <Box id="qb-questions" sx={{ scrollMarginTop: 24 }}>
          <SectionUseForTestFilterRow
            value={sectionUseForTestFilter}
            counts={DEMO_FILTER_COUNTS}
            onChange={setSectionUseForTestFilter}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mb: 2 }}>
            {DEMO_SECTION_TABS.map((tab) => (
              <BaiTab
                key={tab.id}
                label={tab.label}
                hasContent={tab.hasContent}
                selected={activeTabId === tab.id}
                accentColor={accentColor}
                onClick={() => setActiveTabId(tab.id)}
              />
            ))}
            <Box
              component="button"
              type="button"
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
              {DEMO_SECTION_TABS.length} bài
            </Typography>
          </Box>

          {activeSection ? (
            <Box sx={{ scrollMarginTop: 24, minWidth: 0 }}>
              <MentorTestSectionCard
                section={activeSection}
                index={DEMO_SECTION_TABS.findIndex((tab) => tab.id === activeTabId)}
                accentColor={accentColor}
                scoringMode={SCORING_MODE_AUTO}
                totalScore={100}
                questionCountAll={questionCountAll}
                lockSkillType
                questionBankMode
                allSections={allMockSections}
                coursePublished={false}
                chapterQuizConfig={null}
                defaultExpanded
                onChange={handleSectionChange}
              />
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
