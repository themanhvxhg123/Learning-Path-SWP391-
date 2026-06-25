import { Box, Typography, alpha } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PlayLessonRoundedIcon from '@mui/icons-material/PlayLessonRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { Link } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import Loading from '@/shared/ui/Loading';
import MentorChapterCardMenu from '@/features/mentor/components/course/MentorChapterCardMenu';
import { MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  BUILDER_PANEL_SX,
  CHAPTER_THEME,
  LESSON_THEME,
} from '@/features/mentor/components/course/mentorCourseContentStyles';

function OutlineNavItem({
  label,
  meta,
  icon: Icon,
  iconColor,
  indent = 0,
  onClick,
  disabled = false,
  selected = false,
  trailing = null,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.25,
        width: '100%',
      }}
    >
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
          transition: 'background-color 0.15s, border-color 0.15s',
          '&:hover':
            onClick && !disabled && !selected
              ? { bgcolor: 'rgba(8,145,178,0.06)' }
              : onClick && !disabled && selected
                ? { bgcolor: alpha(PRIMARY, 0.12) }
                : undefined,
          '&:disabled': { opacity: 0.55, cursor: 'default' },
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
              bgcolor: iconColor,
              mt: 0.55,
              flexShrink: 0,
              ml: 0.45,
            }}
          />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: indent >= 1 ? 12 : 13,
              fontWeight: indent === 0 ? 700 : 600,
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
          {meta && (
            <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.15, lineHeight: 1.35 }}>
              {meta}
            </Typography>
          )}
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

export default function MentorQuestionBankCourseOutline({
  coursePaths = [],
  pathsLoading = false,
  selectedPathId = '',
  chapterError = '',
  courseId = '',
  hint = 'Chọn chương để tạo bộ câu hỏi. Danh sách bài học chỉ để tham khảo nội dung.',
  onPathSelect,
  onChapterQuizSetup,
}) {
  if (pathsLoading) {
    return (
      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
        <Loading size={24} />
      </Box>
    );
  }

  if (coursePaths.length === 0) {
    return (
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
        {courseId && (
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
        )}
      </Box>
    );
  }

  return (
    <>
      <Typography sx={{ fontSize: 12, color: MUTED, mb: 1, lineHeight: 1.45 }}>
        {hint}
      </Typography>

      {chapterError ? (
        <Typography sx={{ fontSize: 12, color: '#DC2626', mb: 1, lineHeight: 1.45 }}>
          {chapterError}
        </Typography>
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
        {coursePaths.map((path, pathIndex) => {
          const nodes = path.Nodes ?? [];
          const isSelected = String(path.PathId) === String(selectedPathId);

          return (
            <Box key={path.PathId} sx={{ mb: 0.35 }}>
              <OutlineNavItem
                label={`Chương ${pathIndex + 1}: ${path.PathName}`}
                meta={nodes.length > 0 ? `${nodes.length} bài học` : 'Chưa có bài học'}
                icon={MenuBookRoundedIcon}
                iconColor={CHAPTER_THEME.color}
                selected={isSelected}
                onClick={() => onPathSelect?.(String(path.PathId))}
                trailing={
                  onChapterQuizSetup ? (
                    <MentorChapterCardMenu
                      onQuizSetup={() =>
                        onChapterQuizSetup(path, pathIndex)
                      }
                    />
                  ) : null
                }
              />

              {nodes.map((node, nodeIndex) => (
                <OutlineNavItem
                  key={node.NodeId}
                  label={`Bài ${nodeIndex + 1}: ${node.NodeName}`}
                  icon={PlayLessonRoundedIcon}
                  iconColor={LESSON_THEME.color}
                  indent={1}
                  disabled
                />
              ))}
            </Box>
          );
        })}
      </Box>
    </>
  );
}

export function MentorQuestionBankCourseOutlinePanel({
  courseName = '',
  courseCategory = '',
  chapterTitle = '',
  coursePaths = [],
  pathsLoading = false,
  selectedPathId = '',
  chapterError = '',
  courseId = '',
  hint,
  onPathSelect,
  onChapterQuizSetup,
  onCourseQuizSetup,
}) {
  return (
    <Box sx={{ ...BUILDER_PANEL_SX, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75, mb: 1.25 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
          Mục lục khóa học
        </Typography>
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
            {chapterTitle ? (
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT, mt: 0.35 }}>
                {chapterTitle}
              </Typography>
            ) : null}
            {courseCategory ? (
              <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.35 }}>
                {courseCategory}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>

      <MentorQuestionBankCourseOutline
        coursePaths={coursePaths}
        pathsLoading={pathsLoading}
        selectedPathId={selectedPathId}
        chapterError={chapterError}
        courseId={courseId}
        hint={hint}
        onPathSelect={onPathSelect}
        onChapterQuizSetup={onChapterQuizSetup}
      />
    </Box>
  );
}
