import { useCallback, useState } from 'react';
import { Box, Collapse, IconButton, InputBase, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  countLearningMaterials,
  filterLearningMaterials,
  getLessonPublishBlockReason,
  isNodeActive,
  lessonCanPublish,
  lessonHasContent,
} from '@/features/mentor/utils/mentorCourseContentUtils';
import { NodePublishToggle } from './MentorPublishToggles';
import MentorMaterialRow from './MentorMaterialRow';
import { ContentFieldLabel, ContentShortDescriptionField } from './MentorContentSectionHeading';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import {
  DELETE_ICON_BTN_SX,
  ICON_BTN_SX,
  LESSON_THEME,
  contentAddButtonSx,
  contentFieldSx,
  contentInputInnerSx,
  lessonBlockSx,
  lessonBodySx,
  lessonHeaderSx,
} from './mentorCourseContentStyles';

export default function MentorLessonBlock({
  node,
  nodeIndex,
  errors = {},
  expanded = true,
  onToggle,
  onChange,
  onDelete,
  onAddMaterial,
  onMaterialChange,
  onMaterialDelete,
  onMaterialReorder,
  disabled = false,
  courseId = null,
  chapterId = null,
  tabMode = false,
  fieldsOnly = false,
  showDelete = true,
  hidePublishToggle = false,
}) {
  const materials = filterLearningMaterials(node.Materials ?? node.materials ?? []);
  const materialCount = countLearningMaterials(materials);
  const lessonPublishBlockReason = !isNodeActive(node) && !lessonCanPublish(node)
    ? getLessonPublishBlockReason(node)
    : null;
  const canReorder = materialCount > 1 && !disabled;

  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const resetDragState = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleDragStart = useCallback(
    (index) => (event) => {
      if (!canReorder) return;
      setDragIndex(index);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    },
    [canReorder],
  );

  const handleDragOver = useCallback(
    (index) => (event) => {
      if (!canReorder || dragIndex === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (overIndex !== index) setOverIndex(index);
    },
    [canReorder, dragIndex, overIndex],
  );

  const handleDrop = useCallback(
    (index) => (event) => {
      if (!canReorder) return;
      event.preventDefault();
      const fromIndex =
        dragIndex ?? Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
      if (Number.isNaN(fromIndex) || fromIndex === index) {
        resetDragState();
        return;
      }
      onMaterialReorder(fromIndex, index);
      resetDragState();
    },
    [canReorder, dragIndex, onMaterialReorder, resetDragState],
  );

  const handleDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  const lessonFields = (
  <>
      {!hidePublishToggle ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
            Xuất bản bài học
          </Typography>
          <NodePublishToggle
            node={node}
            onChange={onChange}
            disabled={disabled}
            publishBlockReason={lessonPublishBlockReason}
          />
        </Box>
      ) : null}

      <ContentFieldLabel>Tên bài học *</ContentFieldLabel>
      <Box sx={contentFieldSx(Boolean(errors.NodeName), LESSON_THEME)}>
        <InputBase
          value={node.NodeName}
          onChange={(event) => onChange(node.tempId, { NodeName: event.target.value })}
          disabled={disabled}
          placeholder="Ví dụ: Bài 1 — Giới thiệu"
          fullWidth
          sx={contentInputInnerSx}
        />
      </Box>
      {errors.NodeName && (
        <Typography sx={{ fontSize: 12, color: '#DC2626', mt: 0.5 }}>
          {errors.NodeName}
        </Typography>
      )}

      <ContentShortDescriptionField
        label="Mô tả ngắn"
        value={node.Description}
        onChange={(event) => onChange(node.tempId, { Description: event.target.value })}
        disabled={disabled}
        theme={LESSON_THEME}
        placeholder="Mô tả ngắn về nội dung bài học (tuỳ chọn)"
        labelSx={{ mt: 2 }}
      />
  </>
  );

  const materialsSection = !fieldsOnly ? (
    <Box sx={{ mt: 2.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.04em', textTransform: 'uppercase', mb: 1.25 }}>
        Học liệu
      </Typography>

      {materialCount === 0 ? (
        <Typography sx={{ fontSize: 13, color: MUTED, mb: 1.25, lineHeight: 1.55 }}>
          Bài học này chưa có học liệu.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1.25 }}>
          {materials.map((material, materialIndex) => (
            <MentorMaterialRow
              key={material.tempId}
              material={material}
              materialIndex={materialIndex}
              errors={errors.materials?.[material.tempId] ?? {}}
              onChange={onMaterialChange}
              onDelete={onMaterialDelete}
              disabled={disabled}
              courseId={courseId}
              chapterId={chapterId}
              showDragHandle={canReorder}
              isDragging={dragIndex === materialIndex}
              isDragOver={overIndex === materialIndex && dragIndex !== materialIndex}
              onDragHandleStart={handleDragStart(materialIndex)}
              onDragHandleEnd={handleDragEnd}
              onDragOver={handleDragOver(materialIndex)}
              onDrop={handleDrop(materialIndex)}
            />
          ))}
        </Box>
      )}

      {errors._materials ? (
        <Typography sx={{ fontSize: 12, color: '#DC2626', mb: 1.25, lineHeight: 1.5 }}>
          {errors._materials}
        </Typography>
      ) : null}

      <Box
        component="button"
        type="button"
        onClick={onAddMaterial}
        disabled={disabled}
        sx={{
          ...contentAddButtonSx(),
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <AddRoundedIcon sx={{ fontSize: 16 }} />
        Thêm học liệu
      </Box>
    </Box>
  ) : null;

  const lessonForm = (
    <Box sx={tabMode ? undefined : lessonBodySx()}>
      {lessonFields}
      {materialsSection}
    </Box>
  );

  if (tabMode) {
    return (
      <Box data-content-error={`lesson-${node.tempId}`}>
        {showDelete && onDelete ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              px: 2,
              py: 0.75,
              borderBottom: '1px solid rgba(15,23,42,0.06)',
            }}
          >
            <IconButton
              size="small"
              onClick={onDelete}
              disabled={disabled}
              aria-label="Xóa bài học"
              sx={DELETE_ICON_BTN_SX}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ) : null}
        {lessonForm}
      </Box>
    );
  }

  return (
    <Box sx={lessonBlockSx()} data-content-error={`lesson-${node.tempId}`}>
      <Box sx={lessonHeaderSx(expanded)}>
        <IconButton size="small" onClick={onToggle} sx={ICON_BTN_SX} aria-label="Thu gọn bài học">
          {expanded ? (
            <ExpandLessRoundedIcon sx={{ fontSize: 18 }} />
          ) : (
            <ExpandMoreRoundedIcon sx={{ fontSize: 20 }} />
          )}
        </IconButton>

        <AssignmentOutlinedIcon sx={{ fontSize: 18, color: LESSON_THEME.color, flexShrink: 0 }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, lineHeight: 1.3 }}>
            Bài {nodeIndex + 1}
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: TEXT,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node.NodeName || 'Chưa đặt tên bài học'}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 12, fontWeight: 500, color: MUTED, flexShrink: 0 }}>
          {materialCount} học liệu
        </Typography>

        {onDelete ? (
          <IconButton
            size="small"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Xóa bài học"
            sx={DELETE_ICON_BTN_SX}
          >
            <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ) : null}
      </Box>

      <Collapse in={expanded}>{lessonForm}</Collapse>
    </Box>
  );
}
