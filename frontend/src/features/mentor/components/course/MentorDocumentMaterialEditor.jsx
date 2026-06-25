import { useCallback, useRef, useState } from 'react';
import { Box, IconButton, InputBase, Typography } from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import AppButton from '@/shared/ui/AppButton';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import { MATERIAL_TYPE_THEME } from './mentorCourseContentStyles';
import {
  DOC_ALLOWED_EXTENSIONS,
  DOC_SOURCE_LINK,
  DOC_SOURCE_UPLOAD,
  formatFileSize,
  getDocFileTypeLabel,
  getMaterialMaxFileSizeLabel,
  validateDocFile,
} from '@/features/mentor/utils/mentorCourseContentUtils';

// TODO: backend should support document upload and SourceType

const PRIMARY = '#0891B2';

const SOURCE_OPTIONS = [
  { value: DOC_SOURCE_UPLOAD, label: 'Tải file lên', icon: CloudUploadRoundedIcon },
  { value: DOC_SOURCE_LINK, label: 'Gắn link', icon: LinkRoundedIcon },
];

function SourceOptionButton({ option, selected, disabled, onSelect }) {
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
        minHeight: 40,
        px: 1.25,
        border: 'none',
        borderRadius: '10px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13,
        fontWeight: isSelected ? 700 : 600,
        fontFamily: 'inherit',
        color: isSelected ? PRIMARY : MUTED,
        bgcolor: isSelected ? 'rgba(8,145,178,0.10)' : 'transparent',
        transition: 'background-color 0.15s, color 0.15s',
        opacity: disabled ? 0.6 : 1,
        '&:hover': disabled
          ? {}
          : {
              bgcolor: isSelected ? 'rgba(8,145,178,0.14)' : 'rgba(15,23,42,0.04)',
              color: isSelected ? PRIMARY : TEXT,
            },
      }}
    >
      <Icon sx={{ fontSize: 18 }} />
      {option.label}
    </Box>
  );
}

export default function MentorDocumentMaterialEditor({
  material,
  errors = {},
  onChange,
  disabled = false,
}) {
  const theme = MATERIAL_TYPE_THEME.DOC;
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileTypeError, setFileTypeError] = useState('');

  const sourceType = material.SourceType === DOC_SOURCE_LINK ? DOC_SOURCE_LINK : DOC_SOURCE_UPLOAD;
  const hasFile = Boolean(material.File);
  const hasStoredFile = Boolean(material.FileName && material.MaterialUrl);
  const hasUploadedFile = hasFile || hasStoredFile;

  const applyFile = useCallback(
    (file) => {
      if (!file) return;
      const validation = validateDocFile(file);
      if (!validation.ok) {
        setFileTypeError(validation.message);
        return;
      }
      setFileTypeError('');
      onChange(material.tempId, {
        File: file,
        FileName: file.name,
        FileSize: file.size,
      });
    },
    [material.tempId, onChange],
  );

  const handleSourceChange = (nextSource) => {
    if (nextSource === sourceType) return;
    setFileTypeError('');
    if (nextSource === DOC_SOURCE_LINK) {
      onChange(material.tempId, {
        SourceType: DOC_SOURCE_LINK,
        File: null,
        FileName: null,
        FileSize: null,
      });
      return;
    }
    onChange(material.tempId, {
      SourceType: DOC_SOURCE_UPLOAD,
      MaterialUrl: '',
    });
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) applyFile(file);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const handleRemoveFile = () => {
    setFileTypeError('');
    onChange(material.tempId, {
      File: null,
      FileName: null,
      FileSize: null,
    });
  };

  const fileError = fileTypeError || errors.File;
  const displayFileName = material.File?.name ?? material.FileName ?? '';
  const displayFileSize = material.File?.size ?? material.FileSize;

  return (
    <Box
      sx={{
        mt: 1.25,
        ml: { xs: 0, sm: 0.25 },
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: '16px',
        border: `1px solid ${
          errors.File || errors.MaterialUrl ? '#FECACA' : 'rgba(15,23,42,0.08)'
        }`,
        bgcolor: '#F8FAFC',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <DescriptionRoundedIcon sx={{ fontSize: 20, color: theme.color }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>
          Tài liệu học tập
        </Typography>
      </Box>

      <ContentFieldLabel sx={{ mb: 0.75, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
        Nguồn tài liệu
      </ContentFieldLabel>
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          p: 0.5,
          mb: 1.25,
          borderRadius: '12px',
          bgcolor: '#fff',
          border: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        {SOURCE_OPTIONS.map((option) => (
          <SourceOptionButton
            key={option.value}
            option={option}
            selected={sourceType}
            disabled={disabled}
            onSelect={handleSourceChange}
          />
        ))}
      </Box>

      {sourceType === DOC_SOURCE_UPLOAD ? (
        <>
          {!hasUploadedFile ? (
            <Box
              onDragEnter={(event) => {
                event.preventDefault();
                if (!disabled) setDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!disabled) setDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragOver(false);
              }}
              onDrop={handleDrop}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                py: 2.5,
                px: 2,
                borderRadius: '14px',
                border: `1.5px dashed ${
                  fileError ? '#DC2626' : dragOver ? PRIMARY : 'rgba(15,23,42,0.14)'
                }`,
                bgcolor: dragOver ? 'rgba(8,145,178,0.04)' : '#fff',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: theme.soft,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <InsertDriveFileRoundedIcon sx={{ fontSize: 24, color: theme.color }} />
              </Box>
              <Typography
                sx={{ fontSize: 13, fontWeight: 600, color: TEXT, textAlign: 'center', lineHeight: 1.45 }}
              >
                Kéo thả file vào đây hoặc chọn file
              </Typography>
              <Typography sx={{ fontSize: 12, color: MUTED, textAlign: 'center' }}>
                Hỗ trợ PDF, DOC, DOCX, PPT, PPTX · Tối đa {getMaterialMaxFileSizeLabel()}
              </Typography>
              <AppButton
                variant="outlined"
                size="small"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  mt: 0.5,
                  minWidth: 0,
                  height: 34,
                  px: 1.75,
                  borderRadius: '10px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderColor: 'rgba(15,23,42,0.12)',
                  color: PRIMARY,
                  '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(8,145,178,0.06)' },
                }}
              >
                Chọn file
              </AppButton>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept={DOC_ALLOWED_EXTENSIONS.join(',')}
                disabled={disabled}
                onChange={handleFileInputChange}
              />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1.25,
                borderRadius: '14px',
                bgcolor: '#fff',
                border: '1px solid rgba(15,23,42,0.08)',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: theme.soft,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <InsertDriveFileRoundedIcon sx={{ fontSize: 22, color: theme.color }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: TEXT,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayFileName}
                </Typography>
                <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.2, lineHeight: 1.4 }}>
                  {formatFileSize(displayFileSize)}
                  {displayFileName ? ` · ${getDocFileTypeLabel(displayFileName)}` : ''}
                </Typography>
              </Box>
              <IconButton
                size="small"
                disabled={disabled}
                onClick={handleRemoveFile}
                aria-label="Xóa file"
                sx={{ color: MUTED, '&:hover': { color: '#DC2626', bgcolor: 'rgba(220,38,38,0.06)' } }}
              >
                <CloseRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          )}
          {fileError && (
            <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5 }}>{fileError}</Typography>
          )}
        </>
      ) : (
        <Box>
          <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            Link tài liệu
          </ContentFieldLabel>
          <InputBase
            value={material.MaterialUrl ?? ''}
            onChange={(event) => onChange(material.tempId, { MaterialUrl: event.target.value })}
            disabled={disabled}
            placeholder="https://drive.google.com/... hoặc link tài liệu"
            fullWidth
            sx={{
              fontSize: 13,
              color: TEXT,
              px: 1,
              py: 0.65,
              borderRadius: '10px',
              border: `1px solid ${errors.MaterialUrl ? '#DC2626' : 'rgba(15,23,42,0.12)'}`,
              bgcolor: '#fff',
              '&:focus-within': { borderColor: errors.MaterialUrl ? '#DC2626' : PRIMARY },
            }}
          />
          <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.5, lineHeight: 1.45 }}>
            Có thể dùng link Google Drive, OneDrive hoặc file PDF online.
          </Typography>
          {errors.MaterialUrl && (
            <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.35 }}>
              {errors.MaterialUrl}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
