import { useState } from 'react';
import { Box, IconButton, InputBase, Typography } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import {
  getDocDefaultFields,
  getVideoDefaultFields,
  materialHasContent,
  MATERIAL_URL_LABELS,
  MATERIAL_URL_PLACEHOLDERS,
} from '@/features/mentor/utils/mentorCourseContentUtils';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import {
  CONTENT_FIELD_LABEL_SX,
  DELETE_ICON_BTN_SX,
  contentFieldSx,
  contentInputInnerSx,
  materialRowSx,
} from './mentorCourseContentStyles';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import MentorMaterialTypeSelect, { MATERIAL_TYPE_SELECT_OPTIONS } from './MentorMaterialTypeSelect';
import MentorTextMaterialEditor from './MentorTextMaterialEditor';
import MentorDocumentMaterialEditor from './MentorDocumentMaterialEditor';
import MentorVideoMaterialEditor from './MentorVideoMaterialEditor';

function getMaterialTypeLabel(type) {
  return MATERIAL_TYPE_SELECT_OPTIONS.find((opt) => opt.value === type)?.label ?? 'Học liệu';
}

function buildTypeChangePatch(_currentType, nextType) {
  const patch = {
    MaterialType: nextType,
    Title: '',
    Content: '',
    MaterialUrl: '',
    File: null,
    FileName: null,
    FileSize: null,
    SourceType: undefined,
  };

  if (nextType === 'DOC') {
    Object.assign(patch, getDocDefaultFields());
  } else if (nextType === 'VIDEO') {
    Object.assign(patch, getVideoDefaultFields());
  }

  return patch;
}

export default function MentorMaterialRow({
  material,
  materialIndex = 0,
  errors = {},
  onChange,
  onDelete,
  disabled = false,
  showDragHandle = false,
  isDragging = false,
  isDragOver = false,
  onDragHandleStart,
  onDragHandleEnd,
  onDragOver,
  onDrop,
  courseId = null,
  chapterId = null,
  tabMode = false,
  hideDelete = false,
}) {
  const isText = material.MaterialType === 'TEXT';
  const isDoc = material.MaterialType === 'DOC';
  const isVideo = material.MaterialType === 'VIDEO';
  const showUrlField = !isText && !isDoc && !isVideo;
  const placeholder = MATERIAL_URL_PLACEHOLDERS[material.MaterialType] ?? '';
  const urlLabel = MATERIAL_URL_LABELS[material.MaterialType] ?? 'Link';
  const [pendingTypeChange, setPendingTypeChange] = useState(null);

  const handleMaterialTypeChange = (event) => {
    const nextType = event.target.value;
    if (nextType === material.MaterialType) return;

    if (materialHasContent(material)) {
      setPendingTypeChange(nextType);
      return;
    }

    onChange(material.tempId, buildTypeChangePatch(material.MaterialType, nextType));
  };

  const handleConfirmTypeChange = () => {
    if (!pendingTypeChange) return;
    onChange(
      material.tempId,
      buildTypeChangePatch(material.MaterialType, pendingTypeChange),
    );
    setPendingTypeChange(null);
  };

  const pendingTypeLabel = pendingTypeChange
    ? getMaterialTypeLabel(pendingTypeChange)
    : '';
  const currentTypeLabel = getMaterialTypeLabel(material.MaterialType);

  const titleField = (
    <Box>
      <ContentFieldLabel>Tiêu đề{isText ? '' : ' *'}</ContentFieldLabel>
      <Box sx={contentFieldSx(Boolean(errors.Title))}>
        <InputBase
          value={material.Title}
          onChange={(event) => onChange(material.tempId, { Title: event.target.value })}
          disabled={disabled}
          placeholder={
            isText
              ? 'Ví dụ: Đoạn văn về chủ đề du lịch (tuỳ chọn)'
              : isDoc
                ? 'Ví dụ: Slide bài giảng tuần 1'
                : 'Ví dụ: Video giới thiệu bài học'
          }
          fullWidth
          sx={contentInputInnerSx}
        />
      </Box>
      {errors.Title && (
        <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>{errors.Title}</Typography>
      )}
    </Box>
  );

  const typeField = (
    <Box>
      <ContentFieldLabel>Loại học liệu</ContentFieldLabel>
      <MentorMaterialTypeSelect
        value={material.MaterialType}
        onChange={handleMaterialTypeChange}
        disabled={disabled}
        error={Boolean(errors.MaterialType)}
      />
      {errors.MaterialType && (
        <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>
          {errors.MaterialType}
        </Typography>
      )}
    </Box>
  );

  return (
    <>
    <Box
      data-content-error={`material-${material.tempId}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      sx={{
        ...(tabMode
          ? { px: 0, py: 0, pt: 0.5, pb: 1 }
          : materialRowSx(isDragOver)),
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {!tabMode ? (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1.25,
        }}
      >
        <Typography sx={{ ...CONTENT_FIELD_LABEL_SX, mb: 0, fontWeight: 700 }}>
          Học liệu {materialIndex + 1}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {showDragHandle ? (
            <Box
              draggable
              onDragStart={onDragHandleStart}
              onDragEnd={onDragHandleEnd}
              aria-label="Kéo để đổi thứ tự học liệu"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                color: MUTED,
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
                '&:active': { cursor: 'grabbing' },
                '&:hover': { color: TEXT },
              }}
            >
              <DragIndicatorRoundedIcon sx={{ fontSize: 20 }} />
            </Box>
          ) : null}
          {onDelete ? (
            <IconButton
              size="small"
              onClick={() => onDelete(material.tempId)}
              disabled={disabled}
              aria-label="Xóa học liệu"
              sx={DELETE_ICON_BTN_SX}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          ) : null}
        </Box>
      </Box>
      ) : (hideDelete || !onDelete) ? null : (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: tabMode ? 0.5 : 1 }}>
          <IconButton
            size="small"
            onClick={() => onDelete(material.tempId)}
            disabled={disabled}
            aria-label="Xóa học liệu"
            sx={DELETE_ICON_BTN_SX}
          >
            <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      )}

      {titleField}

      <Box sx={{ mt: tabMode ? 2 : 1.5 }}>
        {typeField}
      </Box>

      {showUrlField && (
        <Box sx={{ mt: tabMode ? 2 : 1.5 }}>
          <ContentFieldLabel>{urlLabel}</ContentFieldLabel>
          <Box sx={contentFieldSx(Boolean(errors.MaterialUrl))}>
            <InputBase
              value={material.MaterialUrl}
              onChange={(event) => onChange(material.tempId, { MaterialUrl: event.target.value })}
              disabled={disabled}
              placeholder={placeholder}
              fullWidth
              sx={contentInputInnerSx}
            />
          </Box>
          {errors.MaterialUrl && (
            <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>
              {errors.MaterialUrl}
            </Typography>
          )}
        </Box>
      )}

      {isVideo && (
        <Box sx={{ mt: tabMode ? 2 : 1.25 }}>
          <MentorVideoMaterialEditor
            material={material}
            errors={errors}
            onChange={onChange}
            disabled={disabled}
            compact={tabMode}
          />
        </Box>
      )}

      {isDoc && (
        <Box sx={{ mt: tabMode ? 2 : 1.5 }}>
          <MentorDocumentMaterialEditor
            material={material}
            errors={errors}
            onChange={onChange}
            disabled={disabled}
            compact={tabMode}
          />
        </Box>
      )}

      {isText && (
        <Box sx={{ mt: tabMode ? 2 : 1.5 }}>
          <MentorTextMaterialEditor
            material={material}
            errors={errors}
            onChange={onChange}
            disabled={disabled}
            compact={tabMode}
          />
        </Box>
      )}
    </Box>

    <ConfirmDialog
      open={Boolean(pendingTypeChange)}
      onClose={() => setPendingTypeChange(null)}
      onConfirm={handleConfirmTypeChange}
      title="Đổi loại học liệu?"
      message={`Học liệu ${currentTypeLabel} hiện tại đã có nội dung. Nếu chuyển sang ${pendingTypeLabel}, toàn bộ dữ liệu hiện tại sẽ bị xóa và không thể hoàn tác.`}
      confirmLabel="Đổi loại"
      cancelLabel="Hủy"
      destructive
    />
    </>
  );
}
