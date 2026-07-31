/**
 * =============================================================================
 * MentorQuestionBankOutlinePanel — Mục lục nội dung (cột phải workspace)
 * =============================================================================
 *
 * MỤC ĐÍCH: Cây mục lục skill → section → câu hỏi; click để nhảy nhanh.
 * LUỒNG: Click mục → onNavigateToItem(target) → parent scroll + đổi active section.
 *
 * Mục lục nội dung + mục lục khóa học — cột phải workspace question bank.
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Collapse, Typography, alpha } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PlayLessonRoundedIcon from '@mui/icons-material/PlayLessonRounded';
import { Link } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import Loading from '@/shared/ui/Loading';
import MentorChapterCardMenu from '@/features/mentor/components/course/MentorChapterCardMenu';
import {
  BUILDER_PANEL_SX,
  CHAPTER_THEME,
  LESSON_THEME,
} from '@/features/mentor/components/course/mentorCourseContentStyles';
import { MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { HEADER_HEIGHT } from '@/shared/layout/MainLayout';
import {
  getFilledTestQuestions,
  getNonEmptyQuestionBankSections,
  getQuestionBankSectionTabLabel,
  getSectionBaiNumber,
  getSectionsBySkill,
  isQuestionActive,
  isQuestionBankVocabularySkill,
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
  QUESTION_BANK_SKILLS,
  filterSectionsByUseForTest,
  resolveSectionsForUseForTestFilter,
  SECTION_USE_FOR_TEST_FILTER,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  getSkillTestUsageLabel,
  getVocabularySectionTestUsage,
} from '@/features/mentor/utils/mentorChapterQuizConfigUtils';

const OUTLINE_SKILL_ITEMS = QUESTION_BANK_SKILLS.map((skill) => ({
  skill,
  icon: skill === TEST_SKILL_LISTENING
    ? HeadphonesRoundedIcon
    : skill === TEST_SKILL_READING
      ? MenuBookRoundedIcon
      : EditNoteRoundedIcon,
}));

function OutlineNavItem({
  label,
  meta,
  icon: Icon,
  iconColor,
  indent = 0,
  selected = false,
  muted = false,
  disabled = false,
  onClick,
  trailing = null,
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.25, width: '100%' }}>
      <Box
        component="button"
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0.65,
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
          border: selected ? `1px solid ${alpha(PRIMARY, 0.35)}` : '1px solid transparent',
          background: 'none',
          cursor: onClick && !disabled ? 'pointer' : 'default',
          font: 'inherit',
          pl: indent * 1.5 + 0.5,
          pr: 0.5,
          py: 0.55,
          borderRadius: '10px',
          bgcolor: selected ? alpha(PRIMARY, 0.08) : 'transparent',
          opacity: muted ? 0.55 : disabled ? 0.55 : 1,
          transition: 'background-color 0.15s, border-color 0.15s',
          '&:hover':
            onClick && !disabled && !selected
              ? { bgcolor: 'rgba(8,145,178,0.06)' }
              : onClick && !disabled && selected
                ? { bgcolor: alpha(PRIMARY, 0.12) }
                : undefined,
        }}
      >
        {Icon ? (
          <Icon sx={{ fontSize: 15, color: selected ? PRIMARY : iconColor, mt: 0.15, flexShrink: 0 }} />
        ) : (
          <Box sx={{ width: 6, height: 6, borderRadius: '999px', bgcolor: iconColor ?? MUTED, mt: 0.55, flexShrink: 0, ml: 0.45 }} />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: indent >= 2 ? 12 : indent === 0 ? 13 : 12,
              fontWeight: selected ? 700 : indent === 0 ? 700 : 600,
              color: selected ? PRIMARY : TEXT,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {label}
          </Typography>
          {meta ? (
            <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.15, lineHeight: 1.35 }}>{meta}</Typography>
          ) : null}
        </Box>
        {selected && !trailing ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 16, color: PRIMARY, mt: 0.1, flexShrink: 0 }} />
        ) : null}
      </Box>
      {trailing ? (
        <Box sx={{ flexShrink: 0, mt: 0.15 }} onClick={(e) => e.stopPropagation()}>
          {trailing}
        </Box>
      ) : null}
    </Box>
  );
}

function truncateQuestionLabel(text, max = 48) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return 'Chưa có nội dung';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function getOutlineSectionLabel(section, sections) {
  const order = getSectionBaiNumber(section, sections);
  const customName = String(
    section?.DisplayName ?? section?.SectionName ?? section?.SectionTitle ?? '',
  ).trim();
  const fallback = getQuestionBankSectionTabLabel(section, sections);

  if (isQuestionBankVocabularySkill(section?.SkillType)) {
    if (customName) return `Section ${order}: ${customName}`;
    return fallback.startsWith('Nhóm') ? fallback.replace(/^Nhóm/, 'Section') : `Section ${order}`;
  }

  if (customName) return `Bài ${order}: ${customName}`;
  return fallback.startsWith('Bài') ? fallback : `Bài ${order}: ${fallback}`;
}

function SkillOutlineCard({
  label,
  meta,
  testUsageLabel = null,
  icon: Icon,
  theme,
  expanded,
  active,
  onToggle,
  children,
}) {
  const accent = theme?.color ?? PRIMARY;
  const accentBg = theme?.bg ?? alpha(PRIMARY, 0.1);

  return (
    <Box
      sx={{
        borderRadius: '14px',
        border: `1px solid ${active ? alpha(accent, 0.35) : 'rgba(15,23,42,0.08)'}`,
        bgcolor: '#fff',
        overflow: 'hidden',
        boxShadow: active ? `0 4px 14px ${alpha(accent, 0.08)}` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '100%',
          p: 1.25,
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          font: 'inherit',
          bgcolor: active ? alpha(accent, 0.06) : 'transparent',
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: alpha(accent, 0.08) },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: accentBg,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18, color: accent }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
            {label}
          </Typography>
          {meta ? (
            <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.2, lineHeight: 1.35 }}>{meta}</Typography>
          ) : null}
          {testUsageLabel ? (
            <Typography sx={{ fontSize: 11.5, color: '#047857', mt: 0.15, lineHeight: 1.35, fontWeight: 600 }}>
              {testUsageLabel}
            </Typography>
          ) : null}
        </Box>

        {expanded ? (
          <KeyboardArrowUpRoundedIcon sx={{ fontSize: 22, color: MUTED, flexShrink: 0 }} />
        ) : (
          <KeyboardArrowDownRoundedIcon sx={{ fontSize: 22, color: MUTED, flexShrink: 0 }} />
        )}
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            px: 1.25,
            pb: 1.15,
            pt: 0.15,
            borderTop: '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.65,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

function SectionOutlineCard({
  label,
  meta,
  testUsageLabel = null,
  inTest = false,
  accent,
  expanded,
  active,
  onToggle,
  children,
}) {
  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: `1px solid ${active ? alpha(accent, 0.28) : 'rgba(15,23,42,0.07)'}`,
        bgcolor: active ? alpha(accent, 0.04) : 'rgba(15,23,42,0.02)',
        overflow: 'hidden',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.65,
          width: '100%',
          px: 0.85,
          py: 0.75,
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          font: 'inherit',
          bgcolor: 'transparent',
          '&:hover': { bgcolor: alpha(accent, 0.06) },
        }}
      >
        <MenuBookRoundedIcon sx={{ fontSize: 15, color: accent, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TEXT, lineHeight: 1.4 }}>
              {label}
            </Typography>
            {inTest ? (
              <Box
                component="span"
                sx={{
                  px: 0.55,
                  py: 0.1,
                  borderRadius: '999px',
                  bgcolor: 'rgba(5,150,105,0.12)',
                  color: '#047857',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                Bài kiểm tra
              </Box>
            ) : null}
          </Box>
          {meta ? (
            <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.1, lineHeight: 1.35 }}>{meta}</Typography>
          ) : null}
          {testUsageLabel ? (
            <Typography sx={{ fontSize: 11, color: '#047857', mt: 0.1, lineHeight: 1.35, fontWeight: 600 }}>
              {testUsageLabel}
            </Typography>
          ) : null}
        </Box>
        {expanded ? (
          <KeyboardArrowUpRoundedIcon sx={{ fontSize: 20, color: MUTED, flexShrink: 0 }} />
        ) : (
          <KeyboardArrowDownRoundedIcon sx={{ fontSize: 20, color: MUTED, flexShrink: 0 }} />
        )}
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            px: 0.65,
            pb: 0.65,
            pt: 0.1,
            borderTop: '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.2,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

function QuestionOutlineItem({ label, meta, selected, muted, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.65,
        width: '100%',
        textAlign: 'left',
        border: selected ? `1px solid ${alpha(PRIMARY, 0.35)}` : '1px solid transparent',
        background: 'none',
        cursor: 'pointer',
        font: 'inherit',
        px: 0.85,
        py: 0.65,
        borderRadius: '10px',
        bgcolor: selected ? alpha(PRIMARY, 0.08) : 'transparent',
        opacity: muted ? 0.55 : 1,
        transition: 'background-color 0.15s, border-color 0.15s',
        '&:hover': { bgcolor: selected ? alpha(PRIMARY, 0.12) : 'rgba(8,145,178,0.06)' },
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: '999px', bgcolor: MUTED, mt: 0.55, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: selected ? 700 : 600,
            color: selected ? PRIMARY : TEXT,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {label}
        </Typography>
        {meta ? (
          <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.15, lineHeight: 1.35 }}>{meta}</Typography>
        ) : null}
      </Box>
      {selected ? (
        <CheckCircleRoundedIcon sx={{ fontSize: 16, color: PRIMARY, mt: 0.1, flexShrink: 0 }} />
      ) : null}
    </Box>
  );
}

export default function MentorQuestionBankOutlinePanel({
  sections = [],
  activeSkill,
  activeSectionId = '',
  activeSection = null,
  sectionBaselines = {},
  freezeUseForTestFilter = false,
  sectionUseForTestFilter = SECTION_USE_FOR_TEST_FILTER.ALL,
  onNavigateToItem,
  courseName = '',
  courseCategory = '',
  chapterTitle = '',
  selectedPathName = '',
  courseChapters = [],
  chaptersLoading = false,
  selectedChapterId = '',
  chapterError = '',
  courseId = '',
  chapterQuizConfig = null,
  courseOutlineHint = 'Chọn chương để tạo hoặc mở ngân hàng câu hỏi tương ứng.',
  onChapterSelect,
  onChapterQuizSetup,
  onCourseQuizSetup,
}) {
  // expandedSkills: Set các kỹ năng đang mở rộng trong mục lục
  const [expandedSkills, setExpandedSkills] = useState(() => new Set());
  // expandedSections: Set các section đang mở rộng
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  // selectedQuestionId: câu hỏi đang được highlight trong mục lục
  const [selectedQuestionId, setSelectedQuestionId] = useState('');

  const sectionsForUseForTestFilter = useMemo(
    () => resolveSectionsForUseForTestFilter(sections, {
      sectionBaselines,
      activeSection,
      frozen: freezeUseForTestFilter,
    }),
    [sections, sectionBaselines, activeSection, freezeUseForTestFilter],
  );

  const filledSections = getNonEmptyQuestionBankSections(sections);
  const hasContentOutline = filledSections.length > 0;
  const hasFilteredOutline = useMemo(
    () => OUTLINE_SKILL_ITEMS.some(({ skill }) =>
      getNonEmptyQuestionBankSections(
        filterSectionsByUseForTest(getSectionsBySkill(sectionsForUseForTestFilter, skill), sectionUseForTestFilter),
      ).length > 0),
    [sectionsForUseForTestFilter, sectionUseForTestFilter],
  );

  useEffect(() => {
    if (!activeSkill) return;
    setExpandedSkills(new Set([activeSkill]));
    setExpandedSections(new Set());
    setSelectedQuestionId('');
  }, [activeSkill]);

  useEffect(() => {
    if (!activeSectionId) return;
    const section = sections.find((item) => String(item.tempId) === String(activeSectionId));
    if (!section) return;
    setExpandedSkills(new Set([section.SkillType]));
    setExpandedSections(new Set([activeSectionId]));
  }, [activeSectionId, sections]);

  const handleNavigate = (target) => {
    onNavigateToItem?.(target);
  };

  const toggleSkillExpanded = (skill) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  };

  const toggleSectionExpanded = (sectionTempId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionTempId)) {
        next.delete(sectionTempId);
      } else {
        next.add(sectionTempId);
      }
      return next;
    });
  };

  const selectedChapterName = selectedPathName || chapterTitle;

  return (
    <Box
      sx={{
        position: { lg: 'sticky' },
        top: { lg: HEADER_HEIGHT + 16 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Box sx={{ ...BUILDER_PANEL_SX, p: 2 }}>
        {/* Tiêu đề mục lục nội dung */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.85, mb: 1.25 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              bgcolor: 'rgba(8,145,178,0.08)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <ListAltRoundedIcon sx={{ fontSize: 18, color: PRIMARY }} />
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Mục lục nội dung</Typography>
        </Box>

        {!hasContentOutline ? (
          <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
            Thêm câu hỏi để xem mục lục và điều hướng nhanh.
          </Typography>
        ) : !hasFilteredOutline ? (
          <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
            Không có section nào khớp bộ lọc hiện tại.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: { lg: 'calc(100vh - 280px)' },
              minHeight: 120,
              overflowY: 'auto',
              pr: 0.25,
              mr: -0.25,
            }}
          >
            {OUTLINE_SKILL_ITEMS.map(({ skill, icon: Icon }) => {
              const skillSectionsOutline = getNonEmptyQuestionBankSections(
                filterSectionsByUseForTest(getSectionsBySkill(sectionsForUseForTestFilter, skill), sectionUseForTestFilter),
              );
              if (skillSectionsOutline.length === 0) return null;

              const theme = TEST_SKILL_CHIP_COLORS[skill];
              const skillQuestionCount = skillSectionsOutline.reduce(
                (sum, section) => sum + getFilledTestQuestions(section?.Questions).length,
                0,
              );
              const sectionUnit = skill === TEST_SKILL_VOCABULARY ? 'section' : 'bài';
              const isExpanded = expandedSkills.has(skill);
              const isSkillActive = activeSkill === skill;
              const skillTestUsageLabel = getSkillTestUsageLabel(skill, chapterQuizConfig);

              return (
                <SkillOutlineCard
                  key={skill}
                  label={TEST_SKILL_LABELS[skill]}
                  meta={`${skillSectionsOutline.length} ${sectionUnit} · ${skillQuestionCount} câu hỏi`}
                  testUsageLabel={skillTestUsageLabel}
                  icon={Icon}
                  theme={theme}
                  expanded={isExpanded}
                  active={isSkillActive}
                  onToggle={() => toggleSkillExpanded(skill)}
                >
                  {skillSectionsOutline.map((section) => {
                    const questions = getFilledTestQuestions(section?.Questions ?? []);
                    const sectionLabel = getOutlineSectionLabel(section, sections);
                    const isSectionExpanded = expandedSections.has(section.tempId);
                    const isSectionActive = String(activeSectionId) === String(section.tempId);
                    const sectionTestUsage = skill === TEST_SKILL_VOCABULARY
                      ? getVocabularySectionTestUsage(section.tempId, chapterQuizConfig)
                      : { inTest: false, label: null };

                    return (
                      <SectionOutlineCard
                        key={section.tempId}
                        label={sectionLabel}
                        meta={`${questions.length} câu hỏi`}
                        inTest={sectionTestUsage.inTest}
                        testUsageLabel={sectionTestUsage.label}
                        accent={theme?.color ?? PRIMARY}
                        expanded={isSectionExpanded}
                        active={isSectionActive}
                        onToggle={() => {
                          toggleSectionExpanded(section.tempId);
                          handleNavigate({
                            type: 'section',
                            skill,
                            sectionTempId: section.tempId,
                          });
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.2,
                          }}
                        >
                        {questions.map((question, questionIndex) => {
                          const questionTitle = truncateQuestionLabel(question.QuestionText, 64);
                          const isQuestionSelected = selectedQuestionId === question.tempId;

                          return (
                            <QuestionOutlineItem
                              key={question.tempId}
                              label={`Câu ${questionIndex + 1}: ${questionTitle}`}
                              meta={!isQuestionActive(question) ? 'Ẩn khỏi quiz mới' : undefined}
                              selected={isQuestionSelected}
                              muted={!isQuestionActive(question)}
                              onClick={() => {
                                setSelectedQuestionId(question.tempId);
                                handleNavigate({
                                  type: 'question',
                                  skill,
                                  sectionTempId: section.tempId,
                                  questionTempId: question.tempId,
                                });
                              }}
                            />
                          );
                        })}
                        </Box>
                      </SectionOutlineCard>
                    );
                  })}
                </SkillOutlineCard>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Mục lục khóa học — tạm ẩn
      <Box sx={{ ...BUILDER_PANEL_SX, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75, mb: 1.25 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Mục lục khóa học</Typography>
          {onCourseQuizSetup && courseId ? (
            <MentorChapterCardMenu variant="course" onQuizSetup={onCourseQuizSetup} />
          ) : null}
        </Box>

        <Box
          sx={{
            p: 1.25,
            mb: 1.5,
            borderRadius: '12px',
            bgcolor: 'rgba(8,145,178,0.05)',
            border: '1px solid rgba(8,145,178,0.12)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <MenuBookRoundedIcon sx={{ fontSize: 18, color: PRIMARY, mt: 0.15, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25 }}>
                Khóa học · Chương
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.4 }}>
                {courseName || '—'}
              </Typography>
              {selectedChapterName ? (
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT, mt: 0.35 }}>
                  {selectedChapterName}
                </Typography>
              ) : null}
              {courseCategory ? (
                <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.35 }}>{courseCategory}</Typography>
              ) : null}
            </Box>
          </Box>
        </Box>

        {chaptersLoading ? (
          <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
            <Loading size={24} />
          </Box>
        ) : courseChapters.length === 0 ? (
          <Box
            sx={{
              p: 1.5,
              borderRadius: '12px',
              bgcolor: 'rgba(15,23,42,0.03)',
              border: '1px dashed rgba(15,23,42,0.12)',
            }}
          >
            <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55, mb: 1.25 }}>
              Khóa học này chưa có chương. Tạo chương trước khi tạo ngân hàng câu hỏi theo chương.
            </Typography>
            {courseId ? (
              <AppButton
                component={Link}
                to={`/mentor/courses/${courseId}/content/edit`}
                variant="outlined"
                size="small"
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ height: 34, fontSize: 12, fontWeight: 600, borderRadius: '999px' }}
              >
                Tạo chương cho khóa học
              </AppButton>
            ) : null}
          </Box>
        ) : (
          <>
            <Typography sx={{ fontSize: 12, color: MUTED, mb: 1, lineHeight: 1.45 }}>{courseOutlineHint}</Typography>
            {chapterError ? (
              <Typography sx={{ fontSize: 12, color: '#DC2626', mb: 1, lineHeight: 1.45 }}>{chapterError}</Typography>
            ) : null}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                maxHeight: { lg: 280 },
                overflowY: 'auto',
                pr: 0.25,
                mr: -0.25,
              }}
            >
              {courseChapters.map((path, pathIndex) => {
                const nodes = path.Nodes ?? [];
                const chapterOrder = path.Order ?? pathIndex + 1;
                const isSelected = String(path.PathId) === String(selectedChapterId);

                return (
                  <Box key={path.PathId ?? pathIndex} sx={{ mb: 0.35 }}>
                    <OutlineNavItem
                      label={`Chương ${chapterOrder}: ${path.PathName || `Chương ${chapterOrder}`}`}
                      meta={nodes.length > 0 ? `${nodes.length} bài học` : 'Chưa có bài học'}
                      icon={MenuBookRoundedIcon}
                      iconColor={CHAPTER_THEME.color}
                      selected={isSelected}
                      onClick={() => onChapterSelect?.(String(path.PathId))}
                      trailing={
                        onChapterQuizSetup ? (
                          <MentorChapterCardMenu
                            onQuizSetup={() => onChapterQuizSetup(path, pathIndex)}
                          />
                        ) : null
                      }
                    />
                    {nodes.map((node, nodeIndex) => {
                      const nodeOrder = node.NodeOrder ?? nodeIndex + 1;
                      return (
                        <OutlineNavItem
                          key={node.NodeId ?? nodeIndex}
                          label={`Bài ${nodeOrder}: ${node.NodeName || `Bài ${nodeOrder}`}`}
                          icon={PlayLessonRoundedIcon}
                          iconColor={LESSON_THEME.color}
                          indent={1}
                          disabled
                        />
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Box>
      */}
    </Box>
  );
}
