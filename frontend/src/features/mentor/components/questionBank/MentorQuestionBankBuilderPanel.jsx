/**
 * MentorQuestionBankBuilderPanel — cột giữa workspace (chỉ UI, chưa nối dữ liệu).
 */
import { useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { CREATE_CARD_SX, MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  SECTION_USE_FOR_TEST_FILTER,
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LISTENING,
} from '@/features/mentor/utils/mentorTestContentUtils';

const DEMO_SECTION_TABS = [
  { id: 'demo-1', label: 'Bài 1', hasContent: true },
  { id: 'demo-2', label: 'Bài 2', hasContent: false },
];

const DEMO_FILTER_COUNTS = { all: 2, inTest: 1, notInTest: 1 };

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

export default function MentorQuestionBankBuilderPanel() {
  const accentColor = TEST_SKILL_CHIP_COLORS[TEST_SKILL_LISTENING]?.color ?? PRIMARY;
  const [sectionUseForTestFilter, setSectionUseForTestFilter] = useState(SECTION_USE_FOR_TEST_FILTER.ALL);
  const [activeTabId, setActiveTabId] = useState(DEMO_SECTION_TABS[0].id);

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

          <Box
            sx={{
              scrollMarginTop: 24,
              minWidth: 0,
              p: 3,
              borderRadius: '16px',
              border: '1px dashed rgba(15,23,42,0.12)',
              bgcolor: 'rgba(15,23,42,0.02)',
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: TEXT, mb: 0.75 }}>
              Khu vực soạn section / câu hỏi
            </Typography>
            <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
              MentorTestSectionCard và dữ liệu API sẽ được gắn lại sau.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
