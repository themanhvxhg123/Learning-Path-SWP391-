import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputBase,
  Switch,
  Typography,
  alpha,
} from '@mui/material';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import { useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import { MUTED, PRIMARY, TEXT } from './mentorCourseCreateStyles';
import { contentInputSx } from './mentorCourseContentStyles';
import {
  getChapterQuizConfig,
  saveChapterQuizConfig,
  getCourseQuizConfig,
  saveCourseQuizConfig,
  getChapterQuizConfigsByCourse,
} from '@/features/mentor/services/chapterQuizConfigService';
import questionBankService from '@/features/mentor/services/questionBankService';
import {
  CHAPTER_QUIZ_SKILLS,
  COURSE_QUIZ_CHAPTER_ID,
  QUIZ_SETUP_SCOPE_CHAPTER,
  QUIZ_SETUP_SCOPE_COURSE,
  getChapterQuizConfigTotal,
  getDefaultChapterQuizConfig,
  getDefaultCourseQuizConfig,
  hasChapterQuizConfigErrors,
  syncChapterQuizConfigWithStats,
  patchSectionCountConfig,
  patchSectionQuestionCountConfig,
  validateChapterQuizConfig,
  getSectionCountForPart,
  getSectionQuestionCountForSection,
  getChapterQuizConfigSummary,
  isSkillSectionRandomPick,
  aggregateCourseStatsByChapterIds,
  getSelectedChapterIdsFromConfig,
  initCourseQuizChapterSelection,
  patchCourseChapterSelection,
  syncCourseQuizChapterPrerequisites,
  getSkillSectionGroupsFromStats,
  buildSectionGroupsFromChapterSections,
  normalizeQuizQuestionConfigs,
  isFirstChapterQuiz,
  getRequiredChapterIdsFromConfig,
  sanitizeChapterPrerequisites,
  patchRequiredChapterSelection,
  buildPreviousChapterQuizOptions,
} from '@/features/mentor/utils/mentorChapterQuizConfigUtils';
import {
  TEST_SKILL_CHIP_COLORS,
  TEST_SKILL_QB_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_VOCABULARY,
} from '@/features/mentor/utils/mentorTestContentUtils';
import {
  buildQuestionBankChapterManagePath,
  buildQuestionBankCoursePath,
} from '@/features/mentor/utils/mentorQuestionBankListParams';

const countInputSx = (hasError) => ({
  ...contentInputSx(hasError),
  maxWidth: 88,
});

function ReadonlyInfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: MUTED, minWidth: 72 }}>
        {label}:
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: TEXT, flex: 1 }}>{value}</Typography>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        color: MUTED,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        mb: 1.25,
        mt: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

function PrerequisiteTestSelector({
  options = [],
  selectedChapterIds = [],
  disabled = false,
  saving = false,
  onToggleChapter,
}) {
  const selected = new Set(selectedChapterIds.map(String));

  if (options.length === 0) {
    return (
      <Typography sx={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
        Không có bài kiểm tra chương trước để chọn.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {options.map((option) => {
        const chapterId = String(option.chapterId);
        const isSelected = selected.has(chapterId);

        return (
          <Box
            key={chapterId}
            sx={{
              p: 1,
              borderRadius: '10px',
              bgcolor: isSelected ? 'rgba(124,58,237,0.04)' : '#fff',
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={isSelected}
                disabled={disabled || saving}
                onChange={(e) => onToggleChapter(option.chapterId, e.target.checked)}
                sx={{
                  p: 0.25,
                  mt: 0.1,
                  color: MUTED,
                  '&.Mui-checked': { color: '#7C3AED' },
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.4 }}>
                  Chương {option.chapterIndex + 1}: {option.chapterTitle}
                </Typography>
                <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.2, lineHeight: 1.45 }}>
                  {option.quizTitle}
                  {!option.quizEnabled ? ' · Chưa bật kiểm tra' : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function CourseChapterSelector({
  chapters = [],
  selectedChapterIds = [],
  disabled = false,
  saving = false,
  error = '',
  onToggleChapter,
}) {
  const selected = new Set(selectedChapterIds.map(String));

  if (chapters.length === 0) {
    return (
      <Typography sx={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
        Khóa học chưa có chương nào.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
      {chapters.map((chapter, chapterIndex) => {
        const chapterId = String(chapter.PathId);
        const isSelected = selected.has(chapterId);
        const noBank = !chapter.hasBank;

        return (
          <Box
            key={chapterId}
            sx={{
              p: 1,
              borderRadius: '10px',
              bgcolor: isSelected ? 'rgba(8,145,178,0.04)' : '#fff',
              border: `1px solid ${error && isSelected ? 'rgba(220,38,38,0.35)' : 'rgba(15,23,42,0.08)'}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
              <Checkbox
                size="small"
                checked={isSelected}
                disabled={disabled || saving || noBank}
                onChange={(e) => onToggleChapter(chapter.PathId, e.target.checked)}
                sx={{
                  p: 0.25,
                  mt: 0.1,
                  color: MUTED,
                  '&.Mui-checked': { color: PRIMARY },
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.4 }}>
                  Chương {chapterIndex + 1}: {chapter.PathName}
                </Typography>
                <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.2 }}>
                  {noBank
                    ? 'Chưa có ngân hàng câu hỏi'
                    : chapter.totalActive > 0
                      ? `${chapter.totalActive} câu đang bật`
                      : 'Có ngân hàng nhưng chưa có câu đang bật'}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
      {error ? (
        <Typography sx={{ fontSize: 11, color: '#DC2626', lineHeight: 1.45 }}>{error}</Typography>
      ) : null}
    </Box>
  );
}

function SkillTestSectionList({ groups = [], children = null }) {
  if (groups.length === 0) {
    return (
      <Typography sx={{ fontSize: 12, color: MUTED, lineHeight: 1.5, mt: 1 }}>
        Chưa có section nào trong ngân hàng câu hỏi.
      </Typography>
    );
  }

  const inTestGroups = groups.filter((group) => group.isUseForTest !== false);
  const notInTestGroups = groups.filter((group) => group.isUseForTest === false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
      <Typography sx={{ fontSize: 11, color: MUTED, lineHeight: 1.45 }}>
        Section lấy từ ngân hàng câu hỏi (IsUseForTest):
      </Typography>

      {inTestGroups.map((group) => (
        <Box
          key={group.sectionTempId}
          sx={{
            p: 1,
            borderRadius: '10px',
            bgcolor: 'rgba(8,145,178,0.04)',
            border: '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.4 }}>
            {group.sectionTitle}
          </Typography>
          <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.2 }}>
            {group.availableCount > 0
              ? `${group.availableCount} câu đang bật · Dùng trong bài kiểm tra`
              : 'Section chưa có câu đang bật'}
          </Typography>
          {children ? children(group) : null}
        </Box>
      ))}

      {notInTestGroups.map((group) => (
        <Box
          key={group.sectionTempId}
          sx={{
            p: 1,
            borderRadius: '10px',
            bgcolor: 'rgba(15,23,42,0.03)',
            border: '1px solid rgba(15,23,42,0.08)',
            opacity: 0.92,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: MUTED, lineHeight: 1.4 }}>
            {group.sectionTitle}
          </Typography>
          <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.35, lineHeight: 1.45 }}>
            Section này không được dùng trong bài kiểm tra
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function SectionQuestionCountInput({
  value,
  max = 0,
  disabled = false,
  hasError = false,
  onChange,
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.85 }}>
      <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>Lấy</Typography>
      <InputBase
        type="number"
        inputProps={{ min: 0, max }}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        sx={countInputSx(hasError)}
      />
      <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>câu random</Typography>
    </Box>
  );
}

export default function MentorChapterQuizSetupDialog({
  open,
  onClose,
  scope = QUIZ_SETUP_SCOPE_CHAPTER,
  courseId,
  courseTitle = '',
  chapterId,
  chapterTitle = '',
  chapterIndex = 0,
  paths = [],
}) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [chapterStats, setChapterStats] = useState(null);
  const [allCourseStats, setAllCourseStats] = useState(null);
  const [prerequisiteOptions, setPrerequisiteOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isCourseScope = scope === QUIZ_SETUP_SCOPE_COURSE;
  const showPrerequisiteConfig = !isCourseScope && !isFirstChapterQuiz(chapterIndex);
  const selectedChapterIds = getSelectedChapterIdsFromConfig(config ?? {});
  const requiredChapterIds = getRequiredChapterIdsFromConfig(config ?? {});

  const stats = useMemo(() => {
    if (isCourseScope) {
      if (!allCourseStats?.chapters) {
        return { hasBank: Boolean(allCourseStats?.hasBank) };
      }
      return aggregateCourseStatsByChapterIds(allCourseStats.chapters, selectedChapterIds);
    }
    return chapterStats ?? { hasBank: false };
  }, [isCourseScope, chapterStats, allCourseStats, selectedChapterIds]);

  const hasAnyCourseBank = Boolean(allCourseStats?.hasBank);
  const hasBank = isCourseScope ? hasAnyCourseBank : Boolean(stats?.hasBank);
  const totalQuestions = getChapterQuizConfigTotal(config ?? {}, stats);
  const configSummary = getChapterQuizConfigSummary(config ?? {});
  const courseHasSelectedChapters = !isCourseScope || selectedChapterIds.length > 0;

  const loadData = useCallback(async () => {
    if (!open || courseId == null) return;
    if (!isCourseScope && chapterId == null) return;

    setLoading(true);
    setErrors({});

    try {
      if (isCourseScope) {
        const [configRes, statsRes] = await Promise.all([
          getCourseQuizConfig(courseId, { courseTitle }),
          questionBankService.getCourseQuestionBankActiveStats(courseId),
        ]);

        setAllCourseStats(statsRes.ok ? statsRes : { hasBank: false, chapters: [] });

        let nextConfig = configRes.ok
          ? configRes.config
          : getDefaultCourseQuizConfig({ courseId, courseTitle });

        const chapterOptions = statsRes.ok ? statsRes.chapters ?? [] : [];
        nextConfig = initCourseQuizChapterSelection(nextConfig, chapterOptions);

        const filteredStats = aggregateCourseStatsByChapterIds(
          chapterOptions,
          getSelectedChapterIdsFromConfig(nextConfig),
        );
        if (filteredStats.hasBank) {
          nextConfig = syncChapterQuizConfigWithStats(nextConfig, filteredStats);
        }

        setConfig(nextConfig);
        return;
      }

      const [configRes, statsResRaw, courseConfigsRes] = await Promise.all([
        getChapterQuizConfig(courseId, chapterId, { chapterTitle, chapterIndex }),
        questionBankService.getChapterQuestionBankActiveStats(courseId, chapterId),
        showPrerequisiteConfig
          ? getChapterQuizConfigsByCourse(courseId)
          : Promise.resolve({ ok: true, configs: [] }),
      ]);

      let statsRes = statsResRaw;
      if (statsRes.ok && statsRes.hasBank) {
        const needsSectionFallback =
          !(statsRes.listeningSectionGroups?.length > 0)
          || !(statsRes.readingSectionGroups?.length > 0)
          || !(statsRes.vocabularySectionGroups?.length > 0);

        if (needsSectionFallback) {
          const sectionsRes = await questionBankService.fetchChapterSections(courseId, chapterId);
          if (sectionsRes.ok) {
            const sections = sectionsRes.sections ?? [];
            statsRes = {
              ...statsRes,
              listeningSectionGroups: statsRes.listeningSectionGroups?.length > 0
                ? statsRes.listeningSectionGroups
                : buildSectionGroupsFromChapterSections(sections, TEST_SKILL_LISTENING),
              readingSectionGroups: statsRes.readingSectionGroups?.length > 0
                ? statsRes.readingSectionGroups
                : buildSectionGroupsFromChapterSections(sections, TEST_SKILL_READING),
              vocabularySectionGroups: statsRes.vocabularySectionGroups?.length > 0
                ? statsRes.vocabularySectionGroups
                : buildSectionGroupsFromChapterSections(sections, TEST_SKILL_VOCABULARY),
            };
          }
        }
      }

      let nextConfig = configRes.ok
        ? configRes.config
        : getDefaultChapterQuizConfig({ courseId, chapterId, chapterTitle, chapterIndex });

      nextConfig = sanitizeChapterPrerequisites(nextConfig, chapterIndex);

      if (showPrerequisiteConfig) {
        setPrerequisiteOptions(
          buildPreviousChapterQuizOptions(
            paths,
            chapterIndex,
            courseConfigsRes.ok ? courseConfigsRes.configs : [],
          ),
        );
      } else {
        setPrerequisiteOptions([]);
      }

      if (statsRes.ok) {
        nextConfig = syncChapterQuizConfigWithStats(nextConfig, statsRes);
      }

      setConfig(nextConfig);

      if (statsRes.ok) {
        setChapterStats(statsRes);
      } else {
        setChapterStats({ hasBank: false });
      }
    } finally {
      setLoading(false);
    }
  }, [open, courseId, chapterId, chapterTitle, chapterIndex, courseTitle, isCourseScope, paths, showPrerequisiteConfig]);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      setConfig(null);
      setChapterStats(null);
      setAllCourseStats(null);
      setPrerequisiteOptions([]);
      setErrors({});
    }
  }, [open, loadData]);

  const handleFieldChange = (patch) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((key) => delete next[key]);
      delete next._total;
      delete next._bank;
      return next;
    });
  };

  const handleNumberFieldChange = (key, rawValue, { min = 0, max = null } = {}) => {
    let value = Number.parseInt(String(rawValue), 10);
    if (!Number.isFinite(value)) value = min;
    value = Math.max(min, value);
    if (max != null) value = Math.min(max, value);
    handleFieldChange({ [key]: value });
  };

  const handleSectionCountChange = (part, rawValue) => {
    setConfig((prev) => patchSectionCountConfig(prev, part, rawValue));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[part];
      delete next._total;
      return next;
    });
  };

  const handleSectionQuestionCountChange = (part, sectionTempId, rawValue) => {
    setConfig((prev) => patchSectionQuestionCountConfig(prev, part, sectionTempId, rawValue));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${part}.${sectionTempId}`];
      delete next._total;
      return next;
    });
  };

  const handleCourseChapterToggle = (chapterId, selected) => {
    setConfig((prev) => {
      const withSelection = patchCourseChapterSelection(prev, chapterId, selected);
      const filteredStats = aggregateCourseStatsByChapterIds(
        allCourseStats?.chapters ?? [],
        getSelectedChapterIdsFromConfig(withSelection),
      );
      return syncChapterQuizConfigWithStats(withSelection, filteredStats);
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next._chapters;
      delete next._total;
      CHAPTER_QUIZ_SKILLS.forEach((part) => delete next[part]);
      return next;
    });
  };

  const handleRequiredChapterToggle = (requiredChapterId, selected) => {
    setConfig((prev) => patchRequiredChapterSelection(prev, requiredChapterId, selected));
  };

  const handleCreateQuestionBank = useCallback(() => {
    onClose?.();
    if (isCourseScope) {
      navigate(buildQuestionBankCoursePath(courseId));
      return;
    }
    navigate(buildQuestionBankChapterManagePath(courseId, chapterId));
  }, [chapterId, courseId, isCourseScope, navigate, onClose]);

  const handleSave = async () => {
    if (!config) return;

    const validationErrors = validateChapterQuizConfig(config, stats);
    if (hasChapterQuizConfigErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const payload = isCourseScope
        ? syncCourseQuizChapterPrerequisites(
            normalizeQuizQuestionConfigs({ ...config, courseId, chapterId: COURSE_QUIZ_CHAPTER_ID }),
          )
        : sanitizeChapterPrerequisites(
            normalizeQuizQuestionConfigs({ ...config, courseId, chapterId }),
            chapterIndex,
          );
      const saveFn = isCourseScope ? saveCourseQuizConfig : saveChapterQuizConfig;
      const res = await saveFn(payload);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể lưu thiết lập');
        return;
      }
      toast.success(
        isCourseScope
          ? 'Đã lưu thiết lập kiểm tra toàn khóa'
          : 'Đã lưu thiết lập kiểm tra cho chương',
      );
      onClose?.(res.config);
    } finally {
      setSaving(false);
    }
  };

  const emptyState = useMemo(
    () => (
      <Box
        sx={{
          py: 3,
          px: 2,
          textAlign: 'center',
          borderRadius: '12px',
          bgcolor: 'rgba(15,23,42,0.03)',
          border: '1px dashed rgba(15,23,42,0.12)',
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: TEXT, mb: 0.75 }}>
          {isCourseScope
            ? 'Khóa học này chưa có ngân hàng câu hỏi.'
            : 'Chương này chưa có ngân hàng câu hỏi.'}
        </Typography>
        <Typography sx={{ fontSize: 13, color: MUTED, mb: 2, lineHeight: 1.55 }}>
          {isCourseScope
            ? 'Tạo ngân hàng câu hỏi cho ít nhất một chương trước khi thiết lập kiểm tra toàn khóa.'
            : 'Vui lòng tạo ngân hàng câu hỏi trước khi thiết lập kiểm tra.'}
        </Typography>
        <AppButton
          onClick={handleCreateQuestionBank}
          sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#0E7490' } }}
        >
          {isCourseScope ? 'Mở ngân hàng câu hỏi' : 'Tạo ngân hàng câu hỏi'}
        </AppButton>
      </Box>
    ),
    [handleCreateQuestionBank, isCourseScope],
  );

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose?.()}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: alpha('#0F172A', 0.35),
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(124,58,237,0.12)',
              color: '#7C3AED',
              flexShrink: 0,
              mt: 0.25,
            }}
          >
            <QuizRoundedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
              {isCourseScope ? 'Thiết lập kiểm tra toàn khóa' : 'Thiết lập kiểm tra cho chương'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: MUTED, mt: 0.35, lineHeight: 1.5 }}>
              {isCourseScope
                ? 'Chọn chương và cấu hình số section/câu random từ ngân hàng câu hỏi của các chương đã chọn.'
                : 'Cấu hình số section random (Nghe/Đọc) hoặc số câu random theo section (Từ vựng/Ngữ pháp).'}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Box
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: '12px',
            bgcolor: 'rgba(15,23,42,0.03)',
            border: '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
          }}
        >
          <ReadonlyInfoRow label="Khóa học" value={courseTitle || '—'} />
          {!isCourseScope ? (
            <ReadonlyInfoRow label="Chương" value={chapterTitle || '—'} />
          ) : stats?.bankCount != null ? (
            <ReadonlyInfoRow
              label="Ngân hàng"
              value={`${stats.bankCount ?? allCourseStats?.bankCount ?? 0} chương có ngân hàng câu hỏi`}
            />
          ) : null}
        </Box>

        {loading ? (
          <Typography sx={{ fontSize: 13, color: MUTED, py: 2 }}>Đang tải...</Typography>
        ) : !hasBank ? (
          emptyState
        ) : (
          <>
            {errors._bank && (
              <Typography sx={{ fontSize: 12, color: '#DC2626', mb: 1.5 }}>{errors._bank}</Typography>
            )}

            <SectionTitle>Thông tin kiểm tra</SectionTitle>

            <Box sx={{ mb: 1.5 }}>
              <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12 }}>Tên bài kiểm tra</ContentFieldLabel>
              <InputBase
                value={config?.title ?? ''}
                onChange={(e) => handleFieldChange({ title: e.target.value })}
                disabled={saving}
                placeholder={isCourseScope ? 'Ví dụ: Quiz cuối khóa' : 'Ví dụ: Quiz Chương 1'}
                fullWidth
                sx={contentInputSx(Boolean(errors.title))}
              />
              {errors.title && (
                <Typography sx={{ fontSize: 12, color: '#DC2626', mt: 0.5 }}>{errors.title}</Typography>
              )}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 1.25,
                mb: 1.5,
              }}
            >
              <Box>
                <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12 }}>Thời gian làm bài (phút)</ContentFieldLabel>
                <InputBase
                  type="number"
                  inputProps={{ min: 1 }}
                  value={config?.timeLimitMinutes ?? 15}
                  onChange={(e) => handleNumberFieldChange('timeLimitMinutes', e.target.value, { min: 1 })}
                  disabled={saving}
                  fullWidth
                  sx={contentInputSx(Boolean(errors.timeLimitMinutes))}
                />
                {errors.timeLimitMinutes && (
                  <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5 }}>
                    {errors.timeLimitMinutes}
                  </Typography>
                )}
              </Box>
              <Box>
                <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12 }}>Điểm đạt (%)</ContentFieldLabel>
                <InputBase
                  type="number"
                  inputProps={{ min: 0, max: 100 }}
                  value={config?.passingScore ?? 70}
                  onChange={(e) =>
                    handleNumberFieldChange('passingScore', e.target.value, { min: 0, max: 100 })
                  }
                  disabled={saving}
                  fullWidth
                  sx={contentInputSx(Boolean(errors.passingScore))}
                />
                {errors.passingScore && (
                  <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5 }}>
                    {errors.passingScore}
                  </Typography>
                )}
              </Box>
              <Box>
                <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12 }}>Số lần làm lại</ContentFieldLabel>
                <InputBase
                  type="number"
                  inputProps={{ min: 1 }}
                  value={config?.maxAttempts ?? 3}
                  onChange={(e) => handleNumberFieldChange('maxAttempts', e.target.value, { min: 1 })}
                  disabled={saving}
                  fullWidth
                  sx={contentInputSx(Boolean(errors.maxAttempts))}
                />
                {errors.maxAttempts && (
                  <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5 }}>
                    {errors.maxAttempts}
                  </Typography>
                )}
              </Box>
            </Box>

            <FormControlLabel
              sx={{ mb: 2, ml: 0, alignItems: 'center' }}
              control={
                <Switch
                  checked={Boolean(config?.enabled)}
                  onChange={(e) => handleFieldChange({ enabled: e.target.checked })}
                  disabled={saving}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: PRIMARY },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: alpha(PRIMARY, 0.5),
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                  {isCourseScope ? 'Bật kiểm tra toàn khóa' : 'Bật kiểm tra cho chương'}
                </Typography>
              }
            />

            {showPrerequisiteConfig ? (
              <Box sx={{ mb: 2 }}>
                <SectionTitle>Điều kiện làm bài kiểm tra</SectionTitle>
                <Typography sx={{ fontSize: 12, color: MUTED, mb: 1.25, lineHeight: 1.5 }}>
                  Học viên phải đạt các bài kiểm tra chương được chọn trước khi được làm bài kiểm tra này.
                </Typography>
                <PrerequisiteTestSelector
                  options={prerequisiteOptions}
                  selectedChapterIds={requiredChapterIds}
                  saving={saving}
                  onToggleChapter={handleRequiredChapterToggle}
                />
              </Box>
            ) : null}

            {isCourseScope ? (
              <>
                <SectionTitle>Chọn chương</SectionTitle>
                <Typography sx={{ fontSize: 12, color: MUTED, mb: 1, lineHeight: 1.5 }}>
                  Chỉ random câu hỏi từ các chương được chọn. Học viên phải đạt bài kiểm tra các chương được chọn trước khi được làm bài kiểm tra toàn khóa. Mặc định chọn tất cả chương đã có ngân hàng.
                </Typography>
                <CourseChapterSelector
                  chapters={allCourseStats?.chapters ?? []}
                  selectedChapterIds={selectedChapterIds}
                  saving={saving}
                  error={errors._chapters ?? ''}
                  onToggleChapter={handleCourseChapterToggle}
                />
              </>
            ) : null}

            <SectionTitle>Nguồn câu hỏi</SectionTitle>
            <Typography sx={{ fontSize: 12, color: MUTED, mb: 1.25, lineHeight: 1.5 }}>
              {isCourseScope
                ? 'Random từ các section/câu đang bật "Dùng trong bài kiểm tra" (IsUseForTest) trong ngân hàng các chương đã chọn.'
                : 'Nghe/Đọc: random section. Từ vựng/Ngữ pháp: random câu trong từng section được dùng trong bài kiểm tra.'}
            </Typography>

            {isCourseScope && !courseHasSelectedChapters ? (
              <Typography sx={{ fontSize: 12, color: MUTED, mb: 1.25, lineHeight: 1.5 }}>
                Vui lòng chọn ít nhất một chương để cấu hình nguồn câu hỏi.
              </Typography>
            ) : null}

            {errors._total && (
              <Typography sx={{ fontSize: 12, color: '#DC2626', mb: 1 }}>{errors._total}</Typography>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, mb: 2 }}>
              {CHAPTER_QUIZ_SKILLS.map((part) => {
                const chip = TEST_SKILL_CHIP_COLORS[part];
                const available = stats?.questionCountBySkill?.[part] ?? 0;
                const sectionGroups = getSkillSectionGroupsFromStats(stats, part);
                const hasSectionList = sectionGroups.length > 0;
                const inTestSectionCount = sectionGroups.filter(
                  (group) => group.isUseForTest !== false,
                ).length;
                const isSectionPick = isSkillSectionRandomPick(part);
                const sectionCount = getSectionCountForPart(config ?? {}, part);
                const fieldError = errors[part];
                const inputsDisabled = saving || !config?.enabled || !courseHasSelectedChapters;

                return (
                  <Box
                    key={part}
                    sx={{
                      p: 1.25,
                      borderRadius: '12px',
                      bgcolor: '#fff',
                      border: `1px solid ${
                        fieldError
                        || Object.keys(errors).some((key) => key.startsWith(`${part}.`))
                          ? 'rgba(220,38,38,0.35)'
                          : 'rgba(15,23,42,0.08)'
                      }`,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: chip.color }}>
                        {TEST_SKILL_QB_LABELS[part]}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.25 }}>
                        {isSectionPick
                          ? hasSectionList
                            ? `${inTestSectionCount} section dùng trong bài kiểm tra · Có ${available} câu đang bật`
                            : `Có ${available} câu đang bật`
                          : hasSectionList
                            ? `${inTestSectionCount} section dùng trong bài kiểm tra · Cấu hình số câu random theo section`
                            : `Có ${available} câu đang bật`}
                      </Typography>

                      {isSectionPick ? (
                        <>
                          {hasSectionList ? <SkillTestSectionList groups={sectionGroups} /> : null}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>
                              Lấy
                            </Typography>
                            <InputBase
                              type="number"
                              inputProps={{ min: 0, max: inTestSectionCount }}
                              value={sectionCount}
                              onChange={(e) => handleSectionCountChange(part, e.target.value)}
                              disabled={inputsDisabled}
                              sx={countInputSx(Boolean(fieldError))}
                            />
                            <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>
                              section random
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <SkillTestSectionList groups={sectionGroups}>
                          {(group) => (
                            <>
                              <SectionQuestionCountInput
                                value={getSectionQuestionCountForSection(
                                  config ?? {},
                                  part,
                                  group.sectionTempId,
                                )}
                                max={group.availableCount ?? 0}
                                disabled={inputsDisabled}
                                hasError={Boolean(errors[`${part}.${group.sectionTempId}`])}
                                onChange={(rawValue) =>
                                  handleSectionQuestionCountChange(
                                    part,
                                    group.sectionTempId,
                                    rawValue,
                                  )}
                              />
                              {errors[`${part}.${group.sectionTempId}`] ? (
                                <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5, lineHeight: 1.45 }}>
                                  {errors[`${part}.${group.sectionTempId}`]}
                                </Typography>
                              ) : null}
                            </>
                          )}
                        </SkillTestSectionList>
                      )}

                      {fieldError && (
                        <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.75, lineHeight: 1.45 }}>
                          {fieldError}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Box
              sx={{
                p: 1.25,
                borderRadius: '10px',
                bgcolor: 'rgba(15,23,42,0.04)',
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT, mb: 0.35 }}>
                Tổng ước tính: {totalQuestions} câu
              </Typography>
              <Typography sx={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                Nghe: {configSummary.listeningSections} section
                {' · '}
                Đọc: {configSummary.readingSections} section
                {' · '}
                Từ vựng/Ngữ pháp: {configSummary.vocabularyQuestions} câu
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <AppButton variant="outlined" onClick={() => onClose?.()} disabled={saving}>
          Hủy
        </AppButton>
        <AppButton
          loading={saving}
          disabled={loading || !hasBank}
          onClick={handleSave}
          sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#0E7490' } }}
        >
          Lưu thiết lập
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
