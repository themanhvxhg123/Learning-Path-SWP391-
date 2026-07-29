import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Collapse, IconButton, InputBase, Switch, Tooltip, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import { contentInputSx, contentMultilineInputSx } from './mentorCourseContentStyles';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import MentorTestQuestionCard from './MentorTestQuestionCard';
import MentorTestListeningSourceEditor from './MentorTestListeningSourceEditor';
import MentorTestReadingSourceEditor from './MentorTestReadingSourceEditor';
import {
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
  isQuestionBankVocabularySkill,
  QUESTION_BANK_SKILLS,
  createEmptyTestQuestion,
  getListeningSectionFields,
  getReadingSectionFields,
  getQuestionBankSectionNamePlaceholder,
  canShuffleTestQuestionOptions,
  shuffleTestQuestionOptions,
  getSectionDisplayTitle,
  getSectionScoreLabel,
  isFilledTestQuestion,
  isPersistedQuestionLocked,
  isQuestionPersistedInDatabase,
  validateTestQuestion,
  SCORING_MODE_AUTO,
  hasQuestionUseForTestInSection,
  SECTION_USE_FOR_TEST_REQUIRES_QUESTION_MESSAGE,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  canDisableQuestionBankSectionUseForTest,
  canDisableVocabularyQuestionUseForTest,
  countPublishedQuestionsInSection,
  getListeningReadingPublishLockMessage,
  getRequiredTestSectionCountForSkill,
  getSectionPublishLockMessage,
  getVocabularyQuestionPublishLockMessage,
  getVocabularySectionRequiredQuestionCount,
  isQuestionBankSectionPublishLocked,
  isVocabularyQuestionPublishLocked,
} from '@/features/mentor/utils/mentorChapterQuizConfigUtils';
import { toast } from '@/shared/ui/Toast';

const fieldLabelSx = { mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' };

const SKILL_OPTIONS = [
  { value: TEST_SKILL_LISTENING, label: TEST_SKILL_LABELS[TEST_SKILL_LISTENING], icon: HeadphonesRoundedIcon },
  { value: TEST_SKILL_READING, label: TEST_SKILL_LABELS[TEST_SKILL_READING], icon: MenuBookRoundedIcon },
  { value: TEST_SKILL_VOCABULARY, label: TEST_SKILL_LABELS[TEST_SKILL_VOCABULARY], icon: EditNoteRoundedIcon },
];

function SkillOptionButton({ option, selected, disabled, accentColor, onSelect }) {
  const Icon = option.icon;
  const isSelected = selected === option.value;

  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={() => onSelect(option.value)}
      sx={{
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        minHeight: 36,
        px: 1.25,
        border: 'none',
        borderRadius: '8px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13,
        fontWeight: isSelected ? 700 : 500,
        fontFamily: 'inherit',
        color: isSelected ? accentColor : MUTED,
        bgcolor: isSelected ? `${accentColor}14` : 'transparent',
        transition: 'background-color 0.15s, color 0.15s',
        opacity: disabled ? 0.6 : 1,
        '&:hover': disabled
          ? {}
          : {
              bgcolor: isSelected ? `${accentColor}1e` : 'rgba(15,23,42,0.04)',
              color: isSelected ? accentColor : TEXT,
            },
      }}
    >
      <Icon sx={{ fontSize: 16 }} />
      {option.label}
    </Box>
  );
}

function skillTheme(accentColor) {
  return { color: accentColor };
}

function AddQuestionButton({ onClick, disabled, label = 'Thêm câu hỏi', variant = 'inline' }) {
  const isBlock = variant === 'block';
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: isBlock ? 'center' : 'flex-start',
        gap: 0.5,
        px: isBlock ? 1.75 : 1.25,
        py: isBlock ? 0.75 : 0.55,
        border: `1px ${isBlock ? 'solid' : 'dashed'} rgba(15,23,42,0.14)`,
        borderRadius: '8px',
        bgcolor: isBlock ? '#fff' : 'transparent',
        color: '#64748B',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
        '&:hover': disabled
          ? undefined
          : {
              bgcolor: 'rgba(15,23,42,0.04)',
              borderColor: 'rgba(15,23,42,0.22)',
              color: TEXT,
            },
      }}
    >
      <AddRoundedIcon sx={{ fontSize: 15 }} />
      {label}
    </Box>
  );
}

function getDeleteConfirmContent(deleteConfirm) {
  if (!deleteConfirm) {
    return { title: 'Xác nhận', message: '' };
  }

  return {
    title: 'Xóa câu hỏi?',
    message: `Bạn có chắc muốn xóa câu ${deleteConfirm.index + 1}? Hành động này không thể hoàn tác.`,
  };
}

function SectionUseForTestBadge({ active }) {
  if (active) {
    return (
      <Tooltip title="Section được dùng trong bài kiểm tra" arrow>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '999px',
            bgcolor: 'rgba(5,150,105,0.12)',
            flexShrink: 0,
          }}
        >
          <CheckCircleRoundedIcon sx={{ fontSize: 15, color: '#059669' }} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Section không được dùng trong bài kiểm tra" arrow>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '999px',
          bgcolor: 'rgba(245,158,11,0.16)',
          border: '1px solid rgba(245,158,11,0.35)',
          flexShrink: 0,
        }}
      >
        <Typography
          component="span"
          sx={{ fontSize: 13, fontWeight: 800, color: '#D97706', lineHeight: 1 }}
        >
          !
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default function MentorTestSectionCard({
  section,
  index,
  errors = {},
  accentColor,
  disabled = false,
  scoringMode = SCORING_MODE_AUTO,
  totalScore = 10,
  questionCountAll = 0,
  defaultExpanded = true,
  lockSkillType = false,
  sectionBadgeLabel,
  questionBankMode = false,
  allSections = [],
  coursePublished = false,
  chapterQuizConfig = null,
  persistedQuestionIds = null,
  onChange,
  onRegisterSectionControls,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const childControlsRef = useRef(null);
  const questionsListRef = useRef(null);
  const pendingScrollQuestionIdRef = useRef(null);

  const handleRegisterChildControls = useCallback((controls) => {
    childControlsRef.current = controls;
  }, []);

  useEffect(() => {
    if (!onRegisterSectionControls) return undefined;
    onRegisterSectionControls({
      flush: () => childControlsRef.current?.flush?.(),
      isBusy: () => Boolean(childControlsRef.current?.isBusy?.()),
    });
    return () => onRegisterSectionControls(null);
  }, [onRegisterSectionControls]);

  const questions = section.Questions ?? [];
  const sectionScoreLabel = getSectionScoreLabel(section, scoringMode, totalScore, questionCountAll);
  const skillType = section.SkillType ?? TEST_SKILL_READING;
  const skillChip = TEST_SKILL_CHIP_COLORS[skillType] ?? TEST_SKILL_CHIP_COLORS[TEST_SKILL_READING];
  const skillAccent = skillChip.color;
  const showListeningSource = skillType === TEST_SKILL_LISTENING;
  const isListeningQuestionBank = questionBankMode && showListeningSource;
  const displayTitle = questionBankMode ? '' : getSectionDisplayTitle(section);
  const badgeLabel = sectionBadgeLabel ?? `Phần ${index + 1}`;
  const sectionNamePlaceholder = getQuestionBankSectionNamePlaceholder(section);
  const questionCount = (section?.Questions ?? []).length;
  const sectionMetaLabel = questionBankMode
    ? questionCount > 0
      ? `${questionCount} câu`
      : null
    : sectionScoreLabel;
  const sectionUseForTest = section.isUseForTest !== false;
  const isReadingQuestionBank = questionBankMode && skillType === TEST_SKILL_READING;
  const isVocabularyQuestionBank = questionBankMode && isQuestionBankVocabularySkill(skillType);
  const requiredTestSections = getRequiredTestSectionCountForSkill(skillType, chapterQuizConfig);
  const requiredVocabularyQuestions = isVocabularyQuestionBank
    ? getVocabularySectionRequiredQuestionCount(section.tempId, chapterQuizConfig)
    : 0;
  const sectionPublishLocked = questionBankMode
    && isQuestionBankSectionPublishLocked(section, allSections, chapterQuizConfig);
  const sectionPublishLockMessage = questionBankMode
    ? getSectionPublishLockMessage(section, allSections, chapterQuizConfig)
    : '';
  const sectionTitleLabel = (() => {
    if (!questionBankMode) return 'Tên phần';
    return isReadingQuestionBank ? 'Đề bài' : 'Tên bài';
  })();
  const sectionTitlePlaceholder = (() => {
    if (!questionBankMode) return 'Ví dụ: Phần nghe đoạn hội thoại ngắn';
    return isReadingQuestionBank
      ? 'Ví dụ: Bài đọc về văn hóa Việt Nam'
      : 'Ví dụ: Bài nghe đoạn hội thoại ngắn';
  })();
  const sectionDescLabel = (() => {
    if (!questionBankMode) return 'Mô tả phần';
    return isReadingQuestionBank ? 'Bài đọc' : 'Mô tả bài';
  })();
  const sectionDescPlaceholder = (() => {
    if (!questionBankMode) return 'Mô tả ngắn cho phần kiểm tra (tuỳ chọn)';
    return isReadingQuestionBank
      ? 'Nhập nội dung bài đọc...'
      : 'Mô tả ngắn cho bài (tuỳ chọn)';
  })();
  const listeningPromptValue = (() => {
    const title = String(section.SectionTitle ?? '');
    const desc = String(section.Description ?? '');
    if (title && desc) return `${title}\n\n${desc}`;
    return title || desc;
  })();
  const emptyQuestionsText = questionBankMode
    ? isVocabularyQuestionBank
      ? 'Chưa có câu hỏi trong nhóm này.'
      : 'Chưa có câu hỏi trong bài này.'
    : 'Chưa có câu hỏi trong phần này.';

  const updateSection = (patch) => onChange({ ...section, ...patch });
  const updateQuestions = (nextQuestions) => updateSection({ Questions: nextQuestions });
  const keepTypingKeysInInput = (event) => {
    event.stopPropagation();
  };
  const keepTypingKeysInInputCapture = (event) => {
    event.stopPropagation();
  };

  const handleAddQuestion = () => {
    const newQuestion = createEmptyTestQuestion({ SkillType: skillType });
    pendingScrollQuestionIdRef.current = newQuestion.tempId;
    updateQuestions([...questions, newQuestion]);
  };

  useEffect(() => {
    const tempId = pendingScrollQuestionIdRef.current;
    if (!tempId) return undefined;

    pendingScrollQuestionIdRef.current = null;

    const scrollToNewQuestion = () => {
      const questionEl = document.getElementById(`qb-question-${tempId}`);
      if (questionEl) {
        questionEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        return;
      }

      const listEl = questionsListRef.current;
      if (listEl && listEl.scrollHeight > listEl.clientHeight) {
        listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' });
      }
    };

    const frameId = window.requestAnimationFrame(scrollToNewQuestion);
    return () => window.cancelAnimationFrame(frameId);
  }, [questions]);

  const handleQuestionChange = (questionTempId, nextQuestion) => {
    const prev = questions.find((question) => question.tempId === questionTempId);
    const locked = isPersistedQuestionLocked(prev, persistedQuestionIds, coursePublished);

    if (locked) {
      if (prev?.isUseForTest !== nextQuestion.isUseForTest) {
        updateQuestions(
          questions.map((question) =>
            question.tempId === questionTempId
              ? { ...question, isUseForTest: nextQuestion.isUseForTest }
              : question,
          ),
        );
      }
      return;
    }

    if (
      questionBankMode
      && isVocabularyQuestionBank
      && prev?.isUseForTest !== false
      && nextQuestion.isUseForTest === false
      && !canDisableVocabularyQuestionUseForTest(prev, section, chapterQuizConfig)
    ) {
      toast.warning(
        getVocabularyQuestionPublishLockMessage(
          requiredVocabularyQuestions,
          countPublishedQuestionsInSection(section),
        ),
      );
      return;
    }

    updateQuestions(
      questions.map((question) => (question.tempId === questionTempId ? nextQuestion : question)),
    );
  };

  const handleDeleteQuestion = (questionTempId) => {
    const target = questions.find((question) => question.tempId === questionTempId);
    if (isPersistedQuestionLocked(target, persistedQuestionIds, coursePublished)) return;
    if (questionBankMode && isQuestionPersistedInDatabase(target)) return;

    const nextQuestions = questions.filter((question) => question.tempId !== questionTempId);
    updateSection({ Questions: nextQuestions });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    handleDeleteQuestion(deleteConfirm.tempId);
    setDeleteConfirm(null);
  };

  const deleteDialogContent = getDeleteConfirmContent(deleteConfirm);

  const canShuffleSectionOptions =
    !coursePublished && questions.some((question) => canShuffleTestQuestionOptions(question));

  const handleShuffleAllOptions = () => {
    updateQuestions(questions.map((question) => shuffleTestQuestionOptions(question)));
  };

  const handleSkillChange = (nextSkill) => {
    if (nextSkill === skillType) return;

    const patch = { SkillType: nextSkill };

    if (nextSkill === TEST_SKILL_LISTENING) {
      Object.assign(patch, getListeningSectionFields());
    } else if (nextSkill === TEST_SKILL_READING) {
      Object.assign(patch, getReadingSectionFields());
    } else {
      patch.AudioSourceType = undefined;
      patch.ReadingSourceType = undefined;
      patch.File = null;
      patch.FileName = null;
      patch.FileSize = null;
      patch.MaterialUrl = undefined;
      patch.AudioUrl = undefined;
    }

    updateSection(patch);
  };

  return (
    <>
      <Box
        sx={{
          borderRadius: '14px',
          border: '1px solid rgba(15,23,42,0.08)',
          borderLeft: `3px solid ${skillAccent}`,
          bgcolor: '#fff',
          overflow: questionBankMode && questions.length > 2 ? 'visible' : 'hidden',
          boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
        }}
      >
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: { xs: 1.25, sm: 1.5 },
          py: 0.9,
          borderBottom: expanded ? '1px solid rgba(15,23,42,0.07)' : 'none',
        }}
      >
        {/* Left info block */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flexWrap: 'wrap',
          }}
        >
          {/* QB mode: skill name only */}
          {questionBankMode ? (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <InputBase
                value={section.DisplayName ?? ''}
                onChange={(event) => updateSection({ DisplayName: event.target.value })}
                onKeyDown={keepTypingKeysInInput}
                onKeyDownCapture={keepTypingKeysInInputCapture}
                disabled={disabled}
                placeholder={sectionNamePlaceholder}
                fullWidth
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: TEXT,
                  px: 0.35,
                  py: 0.2,
                  borderBottom: `1px solid ${errors.DisplayName ? '#DC2626' : 'rgba(15,23,42,0.12)'}`,
                  borderRadius: 0,
                  '&:focus-within': {
                    borderBottomColor: errors.DisplayName ? '#DC2626' : skillAccent,
                  },
                  '& input::placeholder': { color: MUTED, opacity: 1, fontWeight: 500 },
                }}
              />
              {errors.DisplayName ? (
                <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35, px: 0.35 }}>
                  {errors.DisplayName}
                </Typography>
              ) : null}
            </Box>
          ) : (
            <>
              <Typography
                component="span"
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEXT,
                  px: 0.85,
                  py: 0.2,
                  borderRadius: '999px',
                  bgcolor: 'rgba(15,23,42,0.06)',
                  flexShrink: 0,
                  lineHeight: 1.5,
                }}
              >
                {badgeLabel}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: skillAccent,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED }}>
                  {TEST_SKILL_LABELS[skillType] ?? ''}
                </Typography>
              </Box>

              {displayTitle ? (
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: TEXT,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: '100%', sm: 240 },
                  }}
                >
                  {displayTitle}
                </Typography>
              ) : null}
            </>
          )}
        </Box>

        {/* Meta: question count (QB) or score label (test material) */}
        {questionBankMode && !expanded ? (
          <SectionUseForTestBadge active={sectionUseForTest} />
        ) : null}
        {sectionMetaLabel ? (
          <Typography
            component="span"
            sx={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {sectionMetaLabel}
          </Typography>
        ) : null}

        {/* Collapse toggle */}
        <IconButton
          size="small"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
          sx={{ color: MUTED, flexShrink: 0, p: 0.45 }}
        >
          {expanded ? (
            <ExpandLessRoundedIcon sx={{ fontSize: 19 }} />
          ) : (
            <ExpandMoreRoundedIcon sx={{ fontSize: 19 }} />
          )}
        </IconButton>
      </Box>

      {/* ── Body ── */}
      <Collapse in={expanded}>
        <Box sx={{ p: { xs: 1.25, sm: 1.5 }, bgcolor: '#F8FAFC' }}>
          {questionBankMode ? (
            <Box sx={{ mb: 1.25, px: 0.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <Tooltip
                  title={sectionPublishLockMessage}
                  arrow
                  disableHoverListener={!sectionPublishLocked}
                >
                  <span>
                    <Switch
                      size="small"
                      checked={sectionUseForTest}
                      onChange={(event) => {
                        const next = event.target.checked;
                        if (next && !hasQuestionUseForTestInSection(section)) {
                          toast.warning(SECTION_USE_FOR_TEST_REQUIRES_QUESTION_MESSAGE);
                          return;
                        }
                        if (
                          !next
                          && !canDisableQuestionBankSectionUseForTest(
                            section,
                            allSections,
                            chapterQuizConfig,
                          )
                        ) {
                          toast.warning(
                            sectionPublishLockMessage
                            || getListeningReadingPublishLockMessage(requiredTestSections),
                          );
                          return;
                        }
                        updateSection({ isUseForTest: next });
                      }}
                      disabled={disabled || sectionPublishLocked}
                      inputProps={{ 'aria-label': 'Section được dùng cho bài kiểm tra' }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: skillAccent },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          bgcolor: skillAccent,
                          opacity: 0.5,
                        },
                      }}
                    />
                  </span>
                </Tooltip>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: MUTED, userSelect: 'none' }}>
                  Section được dùng cho bài kiểm tra
                </Typography>
                {sectionPublishLocked ? (
                  <Typography
                    component="span"
                    sx={{ fontSize: 11, color: '#047857', fontWeight: 600 }}
                  >
                    (bắt buộc cho bài kiểm tra)
                  </Typography>
                ) : null}
                <SectionUseForTestBadge active={sectionUseForTest} />
              </Box>
              {errors.isUseForTest ? (
                <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5, lineHeight: 1.45 }}>
                  {errors.isUseForTest}
                </Typography>
              ) : null}
            </Box>
          ) : null}

          {/* ── Basic info fields ── */}
          {isListeningQuestionBank ? (
            <Box sx={{ mb: 1.5 }}>
              <ContentFieldLabel sx={fieldLabelSx}>Đề bài</ContentFieldLabel>
              <InputBase
                value={listeningPromptValue}
                onChange={(event) =>
                  updateSection({ SectionTitle: event.target.value, Description: '' })
                }
                onKeyDown={keepTypingKeysInInput}
                onKeyDownCapture={keepTypingKeysInInputCapture}
                disabled={disabled}
                placeholder="Ví dụ: Nghe hội thoại giới thiệu bản thân tại văn phòng"
                fullWidth
                multiline
                minRows={2}
                maxRows={6}
                sx={contentMultilineInputSx(Boolean(errors.SectionTitle), skillTheme(skillAccent))}
              />
              {errors.SectionTitle ? (
                <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>
                  {errors.SectionTitle}
                </Typography>
              ) : null}
            </Box>
          ) : isReadingQuestionBank ? (
            <>
              <Box sx={{ mb: 1.25 }}>
                <ContentFieldLabel sx={fieldLabelSx}>Đề bài</ContentFieldLabel>
                <InputBase
                  value={section.SectionTitle ?? ''}
                  onChange={(event) => updateSection({ SectionTitle: event.target.value })}
                  onKeyDown={keepTypingKeysInInput}
                  onKeyDownCapture={keepTypingKeysInInputCapture}
                  disabled={disabled}
                  placeholder={sectionTitlePlaceholder}
                  fullWidth
                  sx={contentInputSx(Boolean(errors.SectionTitle), skillTheme(skillAccent))}
                />
                {errors.SectionTitle ? (
                  <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>
                    {errors.SectionTitle}
                  </Typography>
                ) : null}
              </Box>
              <MentorTestReadingSourceEditor
                section={section}
                errors={errors}
                accentColor={skillAccent}
                disabled={disabled}
                questionBankMode={questionBankMode}
                onChange={(patch) => updateSection(patch)}
                onRegisterControls={handleRegisterChildControls}
              />
            </>
          ) : !isVocabularyQuestionBank ? (
            <>
              <Box sx={{ mb: 1.25 }}>
                <ContentFieldLabel sx={fieldLabelSx}>{sectionTitleLabel}</ContentFieldLabel>
                <InputBase
                  value={section.SectionTitle ?? ''}
                  onChange={(event) => updateSection({ SectionTitle: event.target.value })}
                  onKeyDown={keepTypingKeysInInput}
                  onKeyDownCapture={keepTypingKeysInInputCapture}
                  disabled={disabled}
                  placeholder={sectionTitlePlaceholder}
                  fullWidth
                  sx={contentInputSx(false, skillTheme(skillAccent))}
                />
              </Box>

              {!lockSkillType ? (
                <Box sx={{ mb: 1.25 }}>
                  <ContentFieldLabel sx={fieldLabelSx}>Kỹ năng</ContentFieldLabel>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      p: 0.5,
                      borderRadius: '10px',
                      bgcolor: '#fff',
                      border: `1px solid ${errors.SkillType ? '#DC2626' : 'rgba(15,23,42,0.08)'}`,
                    }}
                  >
                    {SKILL_OPTIONS.map((option) => (
                      <SkillOptionButton
                        key={option.value}
                        option={option}
                        selected={skillType}
                        disabled={disabled}
                        accentColor={TEST_SKILL_CHIP_COLORS[option.value]?.color ?? accentColor}
                        onSelect={handleSkillChange}
                      />
                    ))}
                  </Box>
                  {errors.SkillType && (
                    <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.25 }}>
                      {errors.SkillType}
                    </Typography>
                  )}
                </Box>
              ) : null}

              {!isVocabularyQuestionBank ? (
                <Box sx={{ mb: showListeningSource ? 1.25 : 1.5 }}>
                  <ContentFieldLabel sx={fieldLabelSx}>{sectionDescLabel}</ContentFieldLabel>
                  <InputBase
                    value={section.Description ?? ''}
                    onChange={(event) => updateSection({ Description: event.target.value })}
                    onKeyDown={keepTypingKeysInInput}
                    onKeyDownCapture={keepTypingKeysInInputCapture}
                    disabled={disabled}
                    placeholder={sectionDescPlaceholder}
                    fullWidth
                    multiline
                    minRows={2}
                    sx={contentMultilineInputSx(false, skillTheme(skillAccent))}
                  />
                </Box>
              ) : null}
            </>
          ) : null}

          {/* ── Audio source (Listening) ── */}
          {showListeningSource ? (
            <MentorTestListeningSourceEditor
              section={section}
              errors={errors}
              accentColor={skillAccent}
              disabled={disabled}
              onChange={(patch) => updateSection(patch)}
              onRegisterControls={handleRegisterChildControls}
            />
          ) : null}

          {/* ── Questions header ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.75, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                flex: 1,
                minWidth: 0,
              }}
            >
              Câu hỏi
            </Typography>
            {questions.length > 0 ? (
              <>
                <AddQuestionButton
                  onClick={handleAddQuestion}
                  disabled={disabled}
                  label="Thêm câu hỏi"
                  variant="inline"
                />
                <Tooltip title="Xáo trộn đáp án toàn bài" arrow>
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleShuffleAllOptions}
                      disabled={disabled || !canShuffleSectionOptions}
                      aria-label="Xáo trộn đáp án toàn bài"
                      sx={{
                        p: 0.45,
                        color: MUTED,
                        '&:hover': { color: TEXT, bgcolor: 'rgba(15,23,42,0.06)' },
                      }}
                    >
                      <ShuffleRoundedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            ) : null}
          </Box>

          {errors._questions && (
            <Typography sx={{ fontSize: 11, color: '#DC2626', mb: 1 }}>
              {errors._questions}
            </Typography>
          )}

          {/* ── Questions list / empty state ── */}
          {questions.length === 0 ? (
            <Box sx={{ py: 3.5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: MUTED, mb: 1.5, lineHeight: 1.6 }}>
                {emptyQuestionsText}
                <br />
                <Typography component="span" sx={{ fontSize: 12, color: MUTED }}>
                  Thêm câu hỏi đầu tiên để bắt đầu.
                </Typography>
              </Typography>
              <AddQuestionButton
                onClick={handleAddQuestion}
                disabled={disabled}
                label="Thêm câu hỏi"
                variant="block"
              />
            </Box>
          ) : (
            <Box
              ref={questionsListRef}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                ...(questionBankMode && questions.length > 2
                  ? {
                      maxHeight: { xs: 360, sm: 420 },
                      minHeight: 0,
                      overflowY: 'auto',
                      overscrollBehavior: 'contain',
                      pr: 0.5,
                      scrollPaddingTop: 12,
                      WebkitOverflowScrolling: 'touch',
                      '& > *': { flexShrink: 0 },
                    }
                  : null),
              }}
            >
              {questions.map((question, questionIndex) => {
                const contentLocked = isPersistedQuestionLocked(
                  question,
                  persistedQuestionIds,
                  coursePublished,
                );
                const questionErrors = questionBankMode && isFilledTestQuestion(question)
                  ? validateTestQuestion(question)
                  : (errors.Questions?.[question.tempId] ?? {});
                const hideDelete = questionBankMode && isQuestionPersistedInDatabase(question);
                const questionPublishLocked = questionBankMode
                  && isVocabularyQuestionBank
                  && isVocabularyQuestionPublishLocked(question, section, chapterQuizConfig);
                const questionPublishLockMessage = questionPublishLocked
                  ? getVocabularyQuestionPublishLockMessage(
                    requiredVocabularyQuestions,
                    countPublishedQuestionsInSection(section),
                  )
                  : '';
                return (
                  <MentorTestQuestionCard
                    key={question.tempId}
                    question={question}
                    index={questionIndex}
                    errors={questionErrors}
                    accentColor={skillAccent}
                    disabled={disabled}
                    contentLocked={contentLocked}
                    hideDelete={hideDelete}
                    useForTestLocked={questionPublishLocked}
                    useForTestLockMessage={questionPublishLockMessage}
                    showActiveToggle={questionBankMode || (coursePublished && contentLocked)}
                    collapsibleChoices={questionBankMode}
                    onChange={(nextQuestion) => handleQuestionChange(question.tempId, nextQuestion)}
                    onDelete={() =>
                      setDeleteConfirm({
                        type: 'question',
                        tempId: question.tempId,
                        index: questionIndex,
                      })
                    }
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </Collapse>
      </Box>

      <ConfirmDialog
      open={Boolean(deleteConfirm)}
      onClose={() => setDeleteConfirm(null)}
      onConfirm={handleConfirmDelete}
      title={deleteDialogContent.title}
      message={deleteDialogContent.message}
      confirmLabel="Xóa"
      cancelLabel="Hủy"
      destructive
    />
  </>
  );
}
