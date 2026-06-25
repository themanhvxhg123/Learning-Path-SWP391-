import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AppButton from '@/shared/ui/AppButton';
import MentorChapterCard from './MentorChapterCard';
import MentorChapterQuizSetupDialog from './MentorChapterQuizSetupDialog';
import { CARD_SECTION_META_SX, CARD_SECTION_TITLE_SX, MUTED, PRIMARY, TEXT } from './mentorCourseCreateStyles';
import { BUILDER_PANEL_SX, contentAddButtonSx } from './mentorCourseContentStyles';
import { isPathSnapshotSaved, resolveChapterId } from '@/features/mentor/utils/mentorCourseContentUtils';

export default function MentorCourseContentBuilder({
  paths,
  errors = {},
  expandedPaths = {},
  expandedNodes = {},
  onTogglePath,
  onToggleNode,
  onAddPath,
  onPathChange,
  onPathDelete,
  onAddNode,
  onNodeChange,
  onNodeDelete,
  onAddMaterial,
  onMaterialChange,
  onMaterialDelete,
  onMaterialReorder,
  disabled = false,
  savedPathSnapshots = {},
  savingChapterId = null,
  onSaveChapter,
  courseId = null,
  courseTitle = '',
}) {
  const [quizSetupTarget, setQuizSetupTarget] = useState(null);

  const canConfigureQuiz = courseId != null && courseId !== '';

  const openQuizSetup = (path, pathIndex) => {
    if (!canConfigureQuiz) return;
    setQuizSetupTarget({
      chapterId: resolveChapterId(path, pathIndex),
      chapterTitle: path.PathName?.trim() || `Chương ${pathIndex + 1}`,
      chapterIndex: pathIndex,
    });
  };

  return (
    <>
      <Box id="content-builder-root" data-content-error="content-builder-root">
        <Box sx={{ mb: 3 }}>
          <Typography sx={CARD_SECTION_TITLE_SX}>
            Nội dung khóa học
          </Typography>
          <Typography sx={{ ...CARD_SECTION_META_SX, mt: 0.35, maxWidth: 520 }}>
            Tạo chương, bài học và học liệu theo đúng thứ tự học.
          </Typography>
        </Box>

        {(errors.root ?? []).length > 0 && (
          <Box
            sx={{
              mb: 2,
              px: 1.5,
              py: 1,
              borderRadius: '10px',
              bgcolor: 'rgba(220,38,38,0.04)',
              border: '1px solid rgba(220,38,38,0.12)',
            }}
          >
            {(errors.root ?? []).map((message) => (
              <Typography key={message} sx={{ fontSize: 13, color: '#DC2626' }}>
                {message}
              </Typography>
            ))}
          </Box>
        )}

        {console.log("paths", paths)}
        {paths.length === 0 ? (
          <Box sx={{ ...BUILDER_PANEL_SX, textAlign: 'center', py: 5, px: 2.5 }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 36, color: MUTED, mb: 1.5 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: TEXT, mb: 0.5 }}>
              Chưa có chương nào
            </Typography>
            <Typography sx={{ fontSize: 14, color: MUTED, mb: 2.5, maxWidth: 420, mx: 'auto', lineHeight: 1.55 }}>
              Thêm chương đầu tiên để bắt đầu xây dựng nội dung khóa học.
            </Typography>
            <AppButton
              onClick={onAddPath}
              disabled={disabled}
              startIcon={<AddRoundedIcon />}
              sx={{
                height: 40,
                borderRadius: '10px',
                fontWeight: 600,
                bgcolor: PRIMARY,
                '&:hover': { bgcolor: '#0E7490' },
              }}
            >
              Thêm chương
            </AppButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {paths.map((path, pathIndex) => (
              <MentorChapterCard
                key={path.tempId}
                path={path}
                pathIndex={pathIndex}
                courseId={courseId}
                chapterId={resolveChapterId(path, pathIndex)}
                errors={errors.paths?.[path.tempId] ?? {}}
                expanded={expandedPaths[path.tempId] !== false}
                expandedNodes={expandedNodes}
                onToggle={() => onTogglePath(path.tempId)}
                onToggleNode={onToggleNode}
                onChange={onPathChange}
                onDelete={() => onPathDelete(path.tempId)}
                onAddNode={() => onAddNode(path.tempId)}
                onNodeChange={(nodeTempId, patch) => onNodeChange(path.tempId, nodeTempId, patch)}
                onNodeDelete={onNodeDelete}
                onAddMaterial={onAddMaterial}
                onMaterialChange={onMaterialChange}
                onMaterialDelete={onMaterialDelete}
                onMaterialReorder={onMaterialReorder}
                disabled={disabled}
                isSaved={isPathSnapshotSaved(path, savedPathSnapshots[path.tempId])}
                saving={savingChapterId === path.tempId}
                onSave={() => onSaveChapter?.(path.tempId)}
                onQuizSetup={() => openQuizSetup(path, pathIndex)}
                quizSetupDisabled={!canConfigureQuiz}
                quizSetupDisabledReason={
                  canConfigureQuiz ? '' : 'Lưu khóa học trước khi thiết lập kiểm tra'
                }
              />
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'flex-start', pt: 0.5 }}>
              <Box
                component="button"
                type="button"
                onClick={onAddPath}
                disabled={disabled}
                sx={{
                  ...contentAddButtonSx(),
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <AddRoundedIcon sx={{ fontSize: 18 }} />
                Thêm chương
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <MentorChapterQuizSetupDialog
        open={Boolean(quizSetupTarget)}
        onClose={() => setQuizSetupTarget(null)}
        courseId={courseId}
        courseTitle={courseTitle}
        chapterId={quizSetupTarget?.chapterId}
        chapterTitle={quizSetupTarget?.chapterTitle}
        chapterIndex={quizSetupTarget?.chapterIndex ?? 0}
      />
    </>
  );
}
