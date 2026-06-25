import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Divider, IconButton, InputBase, Typography } from '@mui/material';
import AudiotrackRoundedIcon from '@mui/icons-material/AudiotrackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import { formatFileSize } from '@/features/mentor/utils/mentorCourseContentUtils';
import {
  AUDIO_ALLOWED_EXTENSION_NAMES,
  LISTENING_AUDIO_FILE_ACCEPT,
  LISTENING_SOURCE_LINK,
  LISTENING_SOURCE_UPLOAD,
  getListeningAudioMaxSizeLabel,
  validateListeningAudioFile,
} from '@/features/mentor/utils/mentorTestContentUtils';

const FORMAT_HINT = AUDIO_ALLOWED_EXTENSION_NAMES.map((ext) => ext.toUpperCase()).join(', ');

function fieldInputSx(hasError, accentColor) {
  return {
    fontSize: 13,
    color: TEXT,
    px: 1,
    py: 0.65,
    borderRadius: '8px',
    border: `1px solid ${hasError ? '#DC2626' : 'rgba(15,23,42,0.1)'}`,
    bgcolor: '#fff',
    width: '100%',
    '&:focus-within': { borderColor: hasError ? '#DC2626' : accentColor },
  };
}

export default function MentorTestListeningSourceEditor({
  section,
  errors = {},
  accentColor,
  disabled = false,
  onChange,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileTypeError, setFileTypeError] = useState('');

  const hasFile = Boolean(section.File || section.FileName);
  const audioUrl = String(section.AudioUrl ?? '');
  const hasLink = Boolean(audioUrl.trim());

  const previewUrl = useMemo(() => {
    if (!section.File) return null;
    return URL.createObjectURL(section.File);
  }, [section.File]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applyFile = useCallback(
    (file) => {
      if (!file) return;
      const fileCheck = validateListeningAudioFile(file);
      if (!fileCheck.ok) {
        setFileTypeError(fileCheck.message);
        return;
      }
      setFileTypeError('');
      onChange({
        AudioSourceType: LISTENING_SOURCE_UPLOAD,
        File: file,
        FileName: file.name,
        FileSize: file.size,
        AudioUrl: '',
      });
    },
    [onChange],
  );

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
    onChange({
      File: null,
      FileName: null,
      FileSize: null,
      AudioSourceType: audioUrl.trim() ? LISTENING_SOURCE_LINK : LISTENING_SOURCE_UPLOAD,
    });
  };

  const handleLinkChange = (event) => {
    const nextUrl = event.target.value;
    if (nextUrl.trim()) {
      onChange({
        AudioUrl: nextUrl,
        AudioSourceType: LISTENING_SOURCE_LINK,
        File: null,
        FileName: null,
        FileSize: null,
      });
      setFileTypeError('');
      return;
    }
    onChange({
      AudioUrl: '',
      AudioSourceType: LISTENING_SOURCE_UPLOAD,
    });
  };

  const fileError = fileTypeError || errors.File;
  const linkError = errors.AudioUrl;
  const contextError = errors._audio;
  const hasError = Boolean(fileError || linkError || contextError);
  const displayFileName = section.File?.name ?? section.FileName ?? '';
  const displayFileSize = section.File?.size ?? section.FileSize;

  return (
    <Box sx={{ mb: 1.5 }}>
      <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
        File Audio
      </ContentFieldLabel>

      <Box
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !hasFile) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !hasFile) setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        sx={{
          borderRadius: '10px',
          border: `1.5px dashed ${
            hasError ? '#DC2626' : dragOver ? accentColor : 'rgba(15,23,42,0.12)'
          }`,
          bgcolor: dragOver ? 'rgba(15,23,42,0.02)' : '#fff',
          p: 1.15,
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
      >
        {hasFile ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  bgcolor: 'rgba(15,23,42,0.06)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <AudiotrackRoundedIcon sx={{ fontSize: 17, color: MUTED }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: TEXT,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayFileName}
                </Typography>
                {displayFileSize != null ? (
                  <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.1 }}>
                    {formatFileSize(displayFileSize)}
                  </Typography>
                ) : null}
              </Box>
              <IconButton
                size="small"
                onClick={handleRemoveFile}
                disabled={disabled}
                aria-label="Xóa file audio"
                sx={{ color: MUTED, '&:hover': { color: '#DC2626' } }}
              >
                <CloseRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
            {previewUrl ? (
              /\.mp4$/i.test(displayFileName) ? (
                <Box
                  component="video"
                  controls
                  src={previewUrl}
                  sx={{ display: 'block', width: '100%', mt: 0.85 }}
                />
              ) : (
                <Box
                  component="audio"
                  controls
                  src={previewUrl}
                  sx={{ display: 'block', width: '100%', mt: 0.85 }}
                />
              )
            ) : null}
          </>
        ) : (
          <>
            {/* Upload row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  bgcolor: 'rgba(15,23,42,0.05)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <CloudUploadRoundedIcon sx={{ fontSize: 17, color: MUTED }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 120 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT, lineHeight: 1.35 }}>
                  Kéo thả hoặc chọn file nghe
                </Typography>
                <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.1 }}>
                  {FORMAT_HINT} · Tối đa {getListeningAudioMaxSizeLabel()}
                </Typography>
              </Box>
              <Box
                component="button"
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  px: 1.1,
                  py: 0.55,
                  borderRadius: '8px',
                  border: '1px solid rgba(15,23,42,0.14)',
                  bgcolor: '#fff',
                  color: TEXT,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  flexShrink: 0,
                  '&:hover': disabled ? undefined : { bgcolor: 'rgba(15,23,42,0.04)' },
                }}
              >
                Chọn file
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept={LISTENING_AUDIO_FILE_ACCEPT}
                onChange={handleFileInputChange}
              />
            </Box>

            {/* Divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.85 }}>
              <Divider sx={{ flex: 1, borderColor: 'rgba(15,23,42,0.08)' }} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, flexShrink: 0 }}>
                hoặc
              </Typography>
              <Divider sx={{ flex: 1, borderColor: 'rgba(15,23,42,0.08)' }} />
            </Box>

            {/* Link input row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LinkRoundedIcon
                sx={{ fontSize: 16, color: hasLink ? accentColor : MUTED, flexShrink: 0 }}
              />
              <InputBase
                value={audioUrl}
                onChange={handleLinkChange}
                disabled={disabled}
                placeholder="Dán link audio / video nghe"
                fullWidth
                sx={fieldInputSx(Boolean(linkError), accentColor)}
              />
            </Box>
          </>
        )}

        {fileError ? (
          <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.65 }}>{fileError}</Typography>
        ) : null}
        {linkError ? (
          <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.65 }}>{linkError}</Typography>
        ) : null}
        {contextError ? (
          <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.65 }}>{contextError}</Typography>
        ) : null}
      </Box>
    </Box>
  );
}
