/**
 * Header trang Question Bank (Create & Detail).
 */
import {
  Box,
  Breadcrumbs,
  Chip,
  Link as MuiLink,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link, useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import MentorChapterCardMenu from '@/features/mentor/components/course/MentorChapterCardMenu';
import { MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import { formatMentorCourseDate } from '@/features/mentor/utils/mentorCourseUtils';
import ThumbnailImage from '@/shared/ui/ThumbnailImage';
import { resolveLevelChipSx } from '@/shared/catalog/catalogRegistry';
import {
  TEST_SKILL_LABELS,
  TEST_SKILL_LISTENING,
  TEST_SKILL_READING,
  TEST_SKILL_WRITING,
} from '@/features/mentor/utils/mentorTestContentUtils';

const CREATE_BREADCRUMB_LINK_SX = {
  fontSize: 13,
  color: TEXT,
  fontWeight: 500,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  '&:hover': {
    color: PRIMARY,
    textDecoration: 'underline',
    filter: 'brightness(1.08)',
  },
};

const CREATE_BREADCRUMB_CURRENT_SX = {
  fontSize: 13,
  color: TEXT,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const PILL_CHIP_SX = {
  borderRadius: '999px',
  height: 24,
  fontSize: 12,
  fontWeight: 700,
};

function StatInline({ icon: Icon, label, value, iconColor }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Icon sx={{ fontSize: 16, color: iconColor, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.4 }}>
        {label}:{' '}
        <Box component="span" sx={{ color: TEXT, fontWeight: 700 }}>
          {value}
        </Box>
      </Typography>
    </Box>
  );
}

export default function MentorQuestionBankDetailHeader({
  bankTitle = '',
  courseName = '',
  courseId = null,
  courseCategory = '',
  course = null,
  chapterTitle = '',
  coursePublished = false,
  totalQuestionCount = 0,
  activeQuestionCount = 0,
  questionCountBySkill = {},
  createdAt = null,
  updatedAt = null,
  actions = null,
  isCreateMode = false,
  onBack,
  onQuizSetup,
}) {
  const theme = useTheme();
  const navigate = useNavigate();

  const backPath = courseId
    ? `/mentor/courses/${courseId}/questions`
    : '/mentor/question-banks';
  const backLabel = courseId ? 'Quay lại khóa học' : 'Quay lại danh sách';

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(backPath);
  };

  const displayTitle =
    bankTitle ||
    (isCreateMode ? 'Chọn chương để tạo ngân hàng câu hỏi' : 'Ngân hàng câu hỏi');

  const breadcrumbLabel = isCreateMode && !bankTitle ? 'Tạo mới' : displayTitle;

  const showDates = Boolean(createdAt || updatedAt);

  const resolvedCourseName = isCreateMode
    ? (courseName || course?.CourseName || '')
    : (courseName || course?.CourseName || course?.courseName || '');
  const categoryLabel = isCreateMode
    ? (course?.CategoryDisplayName ?? '')
    : (course?.CategoryDisplayName ?? course?.categoryDisplayName ?? course?.CategoryName ?? course?.categoryName ?? '');
  const levelDisplayName = isCreateMode
    ? (course?.LevelDisplayName ?? '')
    : (course?.LevelDisplayName ?? course?.levelDisplayName ?? '');
  const resolvedCategory =
    courseCategory ||
    [categoryLabel, isCreateMode ? '' : levelDisplayName].filter(Boolean).join(' · ');
  const levelChipSx = levelDisplayName
    ? resolveLevelChipSx({
        id: course?.LevelId,
        displayName: course?.LevelName ?? levelDisplayName,
      })
    : null;

  const statItems = [
    {
      icon: QuizOutlinedIcon,
      label: 'Tổng câu hỏi',
      value: totalQuestionCount,
      iconColor: PRIMARY,
    },
    ...(coursePublished
      ? [
          {
            icon: CheckCircleOutlineRoundedIcon,
            label: 'Dùng cho quiz',
            value: activeQuestionCount,
            iconColor: '#047857',
          },
        ]
      : []),
    {
      icon: HeadphonesRoundedIcon,
      label: TEST_SKILL_LABELS[TEST_SKILL_LISTENING],
      value: questionCountBySkill[TEST_SKILL_LISTENING] ?? 0,
      iconColor: '#7C3AED',
    },
    {
      icon: MenuBookRoundedIcon,
      label: TEST_SKILL_LABELS[TEST_SKILL_READING],
      value: questionCountBySkill[TEST_SKILL_READING] ?? 0,
      iconColor: '#0891B2',
    },
    {
      icon: EditNoteRoundedIcon,
      label: TEST_SKILL_LABELS[TEST_SKILL_WRITING],
      value: questionCountBySkill[TEST_SKILL_WRITING] ?? 0,
      iconColor: '#EA580C',
    },
  ];

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: isCreateMode ? 'center' : { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: isCreateMode ? 'row' : { xs: 'column', sm: 'row' },
          flexWrap: 'nowrap',
          gap: isCreateMode ? 2 : { xs: 1.5, sm: 2 },
          mb: 1.25,
        }}
      >
        {isCreateMode ? (
          <Box
            component="nav"
            aria-label="breadcrumb"
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              minWidth: 0,
              flex: 1,
            }}
          >
            <MuiLink
              component={Link}
              to="/home"
              underline="none"
              sx={{ ...CREATE_BREADCRUMB_LINK_SX, flexShrink: 0 }}
            >
              Trang chủ
            </MuiLink>
            <Box component="span" sx={{ color: TEXT, mx: 0.5, flexShrink: 0 }}>
              /
            </Box>
            <MuiLink
              component={Link}
              to={courseId ? `/mentor/courses/${courseId}` : '/mentor/courses'}
              underline="none"
              sx={{
                ...CREATE_BREADCRUMB_LINK_SX,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={resolvedCourseName || undefined}
            >
              {resolvedCourseName || (courseId ? `Khóa học #${courseId}` : 'Khóa học')}
            </MuiLink>
            <Box component="span" sx={{ color: TEXT, mx: 0.5, flexShrink: 0 }}>
              /
            </Box>
            <MuiLink
              component={Link}
              to={courseId ? backPath : '/mentor/question-banks'}
              underline="none"
              sx={{ ...CREATE_BREADCRUMB_LINK_SX, flexShrink: 0 }}
            >
              Ngân hàng câu hỏi
            </MuiLink>
            <Box component="span" sx={{ color: TEXT, mx: 0.5, flexShrink: 0 }}>
              /
            </Box>
            <Typography component="span" sx={{ ...CREATE_BREADCRUMB_CURRENT_SX, flexShrink: 0 }}>
              Tạo mới
            </Typography>
          </Box>
        ) : (
        <Breadcrumbs
          separator="/"
          sx={{
            flexWrap: 'wrap',
            rowGap: 0.5,
            minWidth: 0,
            flex: 1,
            '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 },
            '& .MuiBreadcrumbs-li': {
              maxWidth: { xs: '100%', sm: 'none' },
            },
          }}
        >
          <MuiLink
            component={Link}
            to="/home"
            underline="hover"
            sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
          >
            Trang chủ
          </MuiLink>
          <>
              {courseId ? (
                <>
                  <MuiLink
                    component={Link}
                    to="/mentor/courses"
                    underline="hover"
                    sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
                  >
                    Khóa học của tôi
                  </MuiLink>
                  <MuiLink
                    component={Link}
                    to={`/mentor/courses/${courseId}`}
                    underline="hover"
                    sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
                  >
                    {courseName || `Khóa học #${courseId}`}
                  </MuiLink>
                  <MuiLink
                    component={Link}
                    to={backPath}
                    underline="hover"
                    sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
                  >
                    Ngân hàng câu hỏi
                  </MuiLink>
                </>
              ) : (
                <MuiLink
                  component={Link}
                  to="/mentor/question-banks"
                  underline="hover"
                  sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}
                >
                  Ngân hàng câu hỏi
                </MuiLink>
              )}
              <Typography sx={{ fontSize: 13, color: TEXT, fontWeight: 600 }} noWrap>
                {breadcrumbLabel}
              </Typography>
            </>
        </Breadcrumbs>
        )}

        <AppButton
          variant="outlined"
          startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 18 }} />}
          onClick={handleBack}
          sx={{
            height: 40,
            px: 2,
            fontSize: 13,
            fontWeight: 600,
            borderRadius: '999px',
            flexShrink: 0,
            width: isCreateMode ? 'auto' : { xs: '100%', sm: 'auto' },
            color: TEXT,
            borderColor: 'rgba(15,23,42,0.12)',
          }}
        >
          {backLabel}
        </AppButton>
      </Box>

      <Box
        sx={{
          p: { xs: 2, sm: 2.25 },
          borderRadius: '20px',
          bgcolor: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: theme.ios18?.shadow?.sm ?? '0 1px 2px rgba(8,145,178,0.04)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'flex-start' },
            gap: 2,
          }}
        >
          {isCreateMode && course ? (
            <ThumbnailImage
              src={course.Thumbnail}
              label={resolvedCourseName}
              alt={resolvedCourseName}
              cacheKey={course.UpdatedAt}
              icon={QuizOutlinedIcon}
              iconSize={24}
              sx={{
                width: { xs: '100%', md: 52 },
                height: { xs: 120, md: 52 },
                borderRadius: '14px',
                flexShrink: 0,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: '100%', md: 52 },
                height: { xs: 8, md: 52 },
                borderRadius: { xs: '999px', md: '14px' },
                flexShrink: 0,
                bgcolor: alpha(PRIMARY, 0.12),
                display: { xs: 'block', md: 'grid' },
                placeItems: 'center',
              }}
            >
              <QuizOutlinedIcon
                sx={{ fontSize: 24, color: PRIMARY, display: { xs: 'none', md: 'block' } }}
              />
            </Box>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.75,
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: 20, sm: 22 },
                    fontWeight: 800,
                    color: TEXT,
                    lineHeight: 1.35,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {displayTitle}
                </Typography>
                {!isCreateMode || bankTitle ? (
                  <Chip
                    size="small"
                    label={coursePublished ? 'Khóa học đã xuất bản' : 'Khóa học chưa xuất bản'}
                    sx={{
                      ...PILL_CHIP_SX,
                      bgcolor: coursePublished ? 'rgba(4,120,87,0.12)' : 'rgba(100,116,139,0.10)',
                      color: coursePublished ? '#047857' : MUTED,
                      border: coursePublished
                        ? '1px solid rgba(4,120,87,0.24)'
                        : '1px solid rgba(100,116,139,0.18)',
                    }}
                  />
                ) : null}
              </Box>
              {!isCreateMode && onQuizSetup ? (
                <MentorChapterCardMenu onQuizSetup={onQuizSetup} />
              ) : null}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1.25 }}>
              <MenuBookRoundedIcon sx={{ fontSize: 17, color: PRIMARY, mt: 0.15, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>
                  Khóa học:{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: TEXT }}>
                    {resolvedCourseName || '—'}
                  </Box>
                  {categoryLabel ? (
                    <>
                      {' · '}
                      <Box component="span" sx={{ fontWeight: 500 }}>
                        {categoryLabel}
                      </Box>
                    </>
                  ) : resolvedCategory && !categoryLabel ? (
                    <>
                      {' · '}
                      <Box component="span" sx={{ fontWeight: 500 }}>
                        {resolvedCategory}
                      </Box>
                    </>
                  ) : null}
                  {' · Chương: '}
                  <Box component="span" sx={{ fontWeight: 700, color: TEXT }}>
                    {chapterTitle || '—'}
                  </Box>
                </Typography>
                {levelDisplayName && levelChipSx ? (
                  <Box sx={{ mt: 0.75 }}>
                    <Chip size="small" label={levelDisplayName} sx={{ ...PILL_CHIP_SX, ...levelChipSx }} />
                  </Box>
                ) : null}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 1, sm: 1.5, md: 2 },
                mb: 1.25,
              }}
            >
              {statItems.map(({ icon, label, value, iconColor }) => (
                <StatInline
                  key={label}
                  icon={icon}
                  label={label}
                  value={value}
                  iconColor={iconColor}
                />
              ))}
            </Box>

            {showDates ? (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: { xs: 0.5, sm: 1.5 },
                  alignItems: 'center',
                }}
              >
                {createdAt ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: MUTED }} />
                    <Typography sx={{ fontSize: 12, color: MUTED }}>
                      Tạo:{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: TEXT }}>
                        {formatMentorCourseDate(createdAt)}
                      </Box>
                    </Typography>
                  </Box>
                ) : null}
                {updatedAt ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: MUTED }} />
                    <Typography sx={{ fontSize: 12, color: MUTED }}>
                      Cập nhật:{' '}
                      <Box component="span" sx={{ fontWeight: 600, color: TEXT }}>
                        {formatMentorCourseDate(updatedAt)}
                      </Box>
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            ) : null}
          </Box>

          {actions ? (
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                gap: 1,
                flexShrink: 0,
                minWidth: 168,
              }}
            >
              {actions}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
