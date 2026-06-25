import { Box, Typography, alpha } from '@mui/material';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import { MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { BUILDER_PANEL_SX } from '@/features/mentor/components/course/mentorCourseContentStyles';
import {
  getFilledTestQuestions,
  getNonEmptyQuestionBankSections,
  getQuestionBankSectionTabLabel,
  getSectionsBySkill,
  isQuestionActive,
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
} from '@/features/mentor/utils/mentorTestContentUtils';

const SKILL_ITEMS = [
  { skill: TEST_SKILL_LISTENING, icon: HeadphonesRoundedIcon },
  { skill: TEST_SKILL_READING, icon: MenuBookRoundedIcon },
  { skill: TEST_SKILL_WRITING, icon: EditNoteRoundedIcon },
];

function OutlineNavItem({
  label,
  meta,
  icon: Icon,
  iconColor,
  indent = 0,
  selected = false,
  muted = false,
  onClick,
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={!onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.65,
        width: '100%',
        textAlign: 'left',
        border: selected ? `1px solid ${alpha(PRIMARY, 0.35)}` : '1px solid transparent',
        background: 'none',
        cursor: onClick ? 'pointer' : 'default',
        font: 'inherit',
        pl: indent * 1.5 + 0.5,
        pr: 0.5,
        py: 0.55,
        borderRadius: '10px',
        bgcolor: selected ? alpha(PRIMARY, 0.08) : 'transparent',
        opacity: muted ? 0.55 : 1,
        transition: 'background-color 0.15s, border-color 0.15s',
        '&:hover': onClick && !selected ? { bgcolor: 'rgba(8,145,178,0.06)' } : undefined,
      }}
    >
      {Icon ? (
        <Icon sx={{ fontSize: 15, color: selected ? PRIMARY : iconColor, mt: 0.15, flexShrink: 0 }} />
      ) : (
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '999px',
            bgcolor: iconColor ?? MUTED,
            mt: 0.55,
            flexShrink: 0,
            ml: 0.45,
          }}
        />
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
          <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.15, lineHeight: 1.35 }}>
            {meta}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

function truncateQuestionLabel(text, max = 48) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return 'Chưa có nội dung';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export default function MentorQuestionBankContentOutline({
  sections = [],
  activeSkill = TEST_SKILL_LISTENING,
  activeSectionId = '',
  onNavigateToItem,
}) {
  const filledSections = getNonEmptyQuestionBankSections(sections);
  const hasContent = filledSections.length > 0;

  const handleNavigate = (target) => {
    onNavigateToItem?.(target);
  };

  return (
    <Box sx={{ ...BUILDER_PANEL_SX, p: 2 }}>
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
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
          Mục lục nội dung
        </Typography>
      </Box>

      {!hasContent ? (
        <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
          Thêm câu hỏi để xem mục lục và điều hướng nhanh.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.25,
            maxHeight: { lg: 'calc(100vh - 280px)' },
            minHeight: 120,
            overflowY: 'auto',
            pr: 0.25,
            mr: -0.25,
          }}
        >
          {SKILL_ITEMS.map(({ skill, icon: Icon }) => {
            const skillSections = getNonEmptyQuestionBankSections(getSectionsBySkill(sections, skill));
            if (skillSections.length === 0) return null;

            const theme = TEST_SKILL_CHIP_COLORS[skill];
            const questionCount = skillSections.reduce(
              (sum, section) => sum + getFilledTestQuestions(section?.Questions).length,
              0,
            );

            return (
              <Box key={skill} sx={{ mb: 0.35 }}>
                <OutlineNavItem
                  label={TEST_SKILL_LABELS[skill]}
                  meta={
                    skill === TEST_SKILL_WRITING
                      ? `${questionCount} câu`
                      : `${skillSections.length} bài · ${questionCount} câu`
                  }
                  icon={Icon}
                  iconColor={theme?.color ?? PRIMARY}
                  selected={activeSkill === skill}
                  onClick={() => handleNavigate({ type: 'skill', skill })}
                />

                {skill === TEST_SKILL_WRITING
                  ? (() => {
                      const writingQuestions = skillSections.flatMap((section) =>
                        getFilledTestQuestions(section?.Questions ?? []),
                      );
                      const writingSectionId = skillSections[0]?.tempId;

                      return writingQuestions.map((question, questionIndex) => (
                        <OutlineNavItem
                          key={question.tempId}
                          label={`Câu ${questionIndex + 1}: ${truncateQuestionLabel(question.QuestionText)}`}
                          meta={!isQuestionActive(question) ? 'Ẩn khỏi quiz mới' : undefined}
                          icon={null}
                          iconColor={theme?.color ?? PRIMARY}
                          indent={1}
                          muted={!isQuestionActive(question)}
                          onClick={() =>
                            handleNavigate({
                              type: 'question',
                              skill,
                              sectionTempId: writingSectionId,
                              questionTempId: question.tempId,
                            })
                          }
                        />
                      ));
                    })()
                  : skillSections.map((section) => {
                      const questions = getFilledTestQuestions(section?.Questions ?? []);
                      const sectionLabel = getQuestionBankSectionTabLabel(section, sections);
                      const isSectionActive =
                        activeSkill === skill && String(activeSectionId) === String(section.tempId);

                      return (
                        <Box key={section.tempId}>
                          <OutlineNavItem
                            label={sectionLabel}
                            meta={`${questions.length} câu hỏi`}
                            icon={MenuBookRoundedIcon}
                            iconColor={theme?.color ?? PRIMARY}
                            indent={1}
                            selected={isSectionActive}
                            onClick={() =>
                              handleNavigate({
                                type: 'section',
                                skill,
                                sectionTempId: section.tempId,
                              })
                            }
                          />

                          {questions.map((question, questionIndex) => (
                            <OutlineNavItem
                              key={question.tempId}
                              label={`Câu ${questionIndex + 1}: ${truncateQuestionLabel(question.QuestionText)}`}
                              meta={!isQuestionActive(question) ? 'Ẩn khỏi quiz mới' : undefined}
                              icon={null}
                              iconColor={theme?.color ?? PRIMARY}
                              indent={2}
                              muted={!isQuestionActive(question)}
                              onClick={() =>
                                handleNavigate({
                                  type: 'question',
                                  skill,
                                  sectionTempId: section.tempId,
                                  questionTempId: question.tempId,
                                })
                              }
                            />
                          ))}
                        </Box>
                      );
                    })}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
