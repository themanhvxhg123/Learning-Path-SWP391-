import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PlayLessonRoundedIcon from '@mui/icons-material/PlayLessonRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import {
  countContentStats,
  filterLearningMaterials,
  MATERIAL_TYPE_LABELS,
  resolveChapterId,
} from '@/features/mentor/utils/mentorCourseContentUtils';
import { MUTED, PRIMARY, TEXT } from './mentorCourseCreateStyles';
import { BUILDER_PANEL_SX, MATERIAL_TYPE_THEME } from './mentorCourseContentStyles';
import MentorChapterCardMenu from './MentorChapterCardMenu';
import MentorChapterQuizSetupDialog from './MentorChapterQuizSetupDialog';
import { QUIZ_SETUP_SCOPE_CHAPTER, QUIZ_SETUP_SCOPE_COURSE } from '@/features/mentor/utils/mentorChapterQuizConfigUtils';

function StatPill({ label, value }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: 1.25,
        py: 1.1,
        borderRadius: '10px',
        bgcolor: '#fff',
        border: '1px solid rgba(15,23,42,0.08)',
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: 16, fontWeight: 600, color: TEXT, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 11, fontWeight: 500, color: MUTED, mt: 0.25, lineHeight: 1.3 }}>
        {label}
      </Typography>
    </Box>
  );
}

function OutlineNavItem({
  label,
  meta,
  icon: Icon,
  iconColor,
  indent = 0,
  onClick,
  disabled = false,
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
          border: 'none',
          background: 'none',
          cursor: onClick && !disabled ? 'pointer' : 'default',
          font: 'inherit',
          pl: indent * 1.5,
          pr: 0.5,
          py: 0.55,
          borderRadius: '10px',
          transition: 'background-color 0.15s',
          '&:hover': onClick && !disabled ? { bgcolor: 'rgba(15,23,42,0.03)' } : undefined,
          '&:disabled': { opacity: 0.55, cursor: 'default' },
        }}
      >
        {Icon ? (
          <Icon sx={{ fontSize: 15, color: iconColor, mt: 0.15, flexShrink: 0 }} />
        ) : iconColor ? (
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
        ) : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: indent === 2 ? 12 : 13,
              fontWeight: indent === 0 ? 700 : 600,
              color: TEXT,
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
      </Box>
      {trailing ? (
        <Box sx={{ flexShrink: 0, mt: 0.15 }} onClick={(e) => e.stopPropagation()}>
          {trailing}
        </Box>
      ) : null}
    </Box>
  );
}

export default function MentorContentOverview({
  paths,
  courseName = '',
  courseId = null,
  footer = null,
  onNavigateToItem,
}) {
  const { pathCount, nodeCount, materialCount } = countContentStats(paths);
  const [quizSetupTarget, setQuizSetupTarget] = useState(null);

  const canConfigureQuiz = courseId != null && courseId !== '';

  const openQuizSetup = (path, pathIndex) => {
    if (!canConfigureQuiz) return;
    setQuizSetupTarget({
      scope: QUIZ_SETUP_SCOPE_CHAPTER,
      chapterId: resolveChapterId(path, pathIndex),
      chapterTitle: path.PathName?.trim() || `Chương ${pathIndex + 1}`,
      chapterIndex: pathIndex,
    });
  };

  const openCourseQuizSetup = () => {
    if (!canConfigureQuiz) return;
    setQuizSetupTarget({ scope: QUIZ_SETUP_SCOPE_COURSE });
  };

  const handleNavigate = (target) => {
    if (onNavigateToItem) onNavigateToItem(target);
  };

  return (
    <>
    <Box
      sx={{
        position: { lg: 'sticky' },
        top: { lg: 24 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ ...BUILDER_PANEL_SX, p: 2 }}>
        <Box sx={{ mb: 1.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, mb: canConfigureQuiz ? 1.25 : 0 }}>
            <InsightsRoundedIcon sx={{ fontSize: 20, color: PRIMARY, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT }}>
              Tổng quan nội dung
            </Typography>
          </Box>
          {canConfigureQuiz ? (
            <MentorChapterCardMenu variant="courseButton" onQuizSetup={openCourseQuizSetup} />
          ) : null}
        </Box>

        {courseName && (
          <Typography sx={{ fontSize: 13, color: MUTED, mb: 1.5, lineHeight: 1.5 }}>
            Khóa học:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: TEXT }}>
              {courseName}
            </Box>
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <StatPill label="Chương" value={pathCount} />
          <StatPill label="Bài học" value={nodeCount} />
          <StatPill label="Học liệu" value={materialCount} />
        </Box>

        {paths.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.55 }}>
            Thêm chương đầu tiên để xem outline nội dung khóa học.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25,
              maxHeight: { lg: 'calc(100vh - 380px)' },
              overflowY: 'auto',
              pr: 0.25,
              mr: -0.25,
            }}
          >
            {/* Update count (chapter, lesson, materials) */}
            {paths.map((path, pathIndex) => {
              const nodes = path.nodes ?? [];
              const chapterTitle = path.PathName || `Chương ${pathIndex + 1}`;

              return (
                <Box key={path.tempId} sx={{ mb: 0.5 }}>
                  <OutlineNavItem
                    label={`Chương ${pathIndex + 1}: ${chapterTitle}`}
                    meta={
                      nodes.length > 0
                        ? `${nodes.length} bài học`
                        : 'Chưa có bài học'
                    }
                    icon={MenuBookRoundedIcon}
                    iconColor={MUTED}
                    indent={0}
                    onClick={() =>
                      handleNavigate({ type: 'chapter', pathTempId: path.tempId })
                    }
                    trailing={
                      <MentorChapterCardMenu
                        variant="button"
                        quizSetupDisabled={!canConfigureQuiz}
                        quizSetupDisabledReason={
                          canConfigureQuiz ? '' : 'Lưu khóa học trước khi thiết lập kiểm tra'
                        }
                        onQuizSetup={() => openQuizSetup(path, pathIndex)}
                      />
                    }
                  />

                  {nodes.map((node, nodeIndex) => {
                    const materials = filterLearningMaterials(node.materials ?? []);
                    const lessonTitle = node.NodeName || `Bài ${nodeIndex + 1}`;

                    return (
                      <Box key={node.tempId}>
                        <OutlineNavItem
                          label={`Bài ${nodeIndex + 1}: ${lessonTitle}`}
                          meta={
                            materials.length > 0
                              ? `${materials.length} học liệu`
                              : 'Chưa có học liệu'
                          }
                          icon={PlayLessonRoundedIcon}
                          iconColor={MUTED}
                          indent={1}
                          onClick={() =>
                            handleNavigate({
                              type: 'lesson',
                              pathTempId: path.tempId,
                              nodeTempId: node.tempId,
                            })
                          }
                        />

                        {materials.map((material, materialIndex) => {
                          const typeLabel =
                            MATERIAL_TYPE_LABELS[material.MaterialType] ?? 'Học liệu';
                          const materialTitle =
                            String(material.Title ?? '').trim() ||
                            `${typeLabel} ${materialIndex + 1}`;
                          const theme =
                            MATERIAL_TYPE_THEME[material.MaterialType] ??
                            MATERIAL_TYPE_THEME.VIDEO;

                          return (
                            <OutlineNavItem
                              key={material.tempId}
                              label={`${typeLabel}: ${materialTitle}`}
                              icon={null}
                              iconColor={theme.color}
                              indent={2}
                              onClick={() =>
                                handleNavigate({
                                  type: 'material',
                                  pathTempId: path.tempId,
                                  nodeTempId: node.tempId,
                                  materialTempId: material.tempId,
                                })
                              }
                            />
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* This content buttons */}
      {footer && (
        <Box sx={{ display: { xs: 'none', lg: 'block' }, width: '100%' }}>
          {footer}
        </Box>
      )}
    </Box>

      <MentorChapterQuizSetupDialog
        open={Boolean(quizSetupTarget)}
        onClose={() => setQuizSetupTarget(null)}
        scope={quizSetupTarget?.scope ?? QUIZ_SETUP_SCOPE_CHAPTER}
        courseId={courseId}
        courseTitle={courseName}
        chapterId={quizSetupTarget?.chapterId}
        chapterTitle={quizSetupTarget?.chapterTitle}
        chapterIndex={quizSetupTarget?.chapterIndex ?? 0}
      />
    </>
  );
}
