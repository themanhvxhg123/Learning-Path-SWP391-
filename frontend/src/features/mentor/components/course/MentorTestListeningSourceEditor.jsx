import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Divider, IconButton, InputBase, LinearProgress, Typography } from '@mui/material';
import AudiotrackRoundedIcon from '@mui/icons-material/AudiotrackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import { ContentFieldLabel } from './MentorContentSectionHeading';
import { MUTED, TEXT } from './mentorCourseCreateStyles';
import { contentInputSx } from './mentorCourseContentStyles';
import { formatFileSize } from '@/features/mentor/utils/mentorCourseContentUtils';
import {
  AUDIO_ALLOWED_EXTENSION_NAMES,
  LISTENING_AUDIO_FILE_ACCEPT,
  LISTENING_SOURCE_LINK,
  LISTENING_SOURCE_UPLOAD,
  LISTENING_UPLOAD_FAILED_MESSAGE,
  getListeningAudioMaxSizeLabel,
  validateListeningAudioFile,
  validateListeningAudioUrl,
} from '@/features/mentor/utils/mentorTestContentUtils';
import { uploadAudioMaterial } from '@/features/mentor/services/materialUploadService';
import {
  isMaterialFileUploadBlocked,
  releaseMaterialFileUploadLock,
  tryAcquireMaterialFileUploadLock,
} from '@/features/mentor/utils/mentorMaterialFileUploadLock';
import {
  LISTENING_PREVIEW_HEIGHT,
  resolveListeningPreview,
} from '@/shared/utils/mediaPreviewUtils';

const FORMAT_HINT = AUDIO_ALLOWED_EXTENSION_NAMES.map((ext) => ext.toUpperCase()).join(', ');

function ListeningPreview({ sourceUrl, fileName }) {
  const preview = useMemo(
    () => resolveListeningPreview(sourceUrl, fileName),
    [sourceUrl, fileName],
  );

  if (!preview.mode || !preview.embedUrl) return null;

  if (preview.mode === 'audio') {
    return (
      <Box
        component="audio"
        controls
        src={preview.embedUrl}
        title={`Nghe ${fileName || 'audio'}`}
        sx={{ display: 'block', width: '100%', mt: 1 }}
      />
    );
  }

  return (
    <Box
      sx={{
        mt: 1,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(15,23,42,0.08)',
        bgcolor: '#F8FAFC',
      }}
    >
      <Box
        component="iframe"
        src={preview.embedUrl}
        title={`Xem trước ${fileName || 'media nghe'}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        sx={{
          display: 'block',
          width: '100%',
          height: LISTENING_PREVIEW_HEIGHT,
          border: 'none',
          bgcolor: '#000',
        }}
      />
    </Box>
  );
}

export default function MentorTestListeningSourceEditor({
  section,
  errors = {},
  accentColor,
  disabled = false,
  onChange,
  onRegisterControls,
}) {
  const fileInputRef = useRef(null);
  const uploadSeqRef = useRef(0);
  const uploadingRef = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileTypeError, setFileTypeError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [removedFileSnapshot, setRemovedFileSnapshot] = useState(null);

  const audioUrl = String(section.AudioUrl ?? section.SourceUrl ?? '').trim();
  const audioSourceType =
    section.AudioSourceType
    ?? (audioUrl && !section.FileName && !section.File ? LISTENING_SOURCE_LINK : LISTENING_SOURCE_UPLOAD);
  const hasUploadedMedia = Boolean(section.FileName || audioUrl);
  const hasLocalFile = Boolean(section.File);
  const hasFile = hasUploadedMedia || hasLocalFile;
  const hasLink = Boolean(audioUrl) && audioSourceType === LISTENING_SOURCE_LINK;
  const displayFileName = section.File?.name ?? section.FileName ?? '';
  const displayFileSize = section.File?.size ?? section.FileSize;
  const isBusy = disabled || uploading;
  uploadingRef.current = uploading;

  useEffect(() => {
    if (!onRegisterControls) return undefined;
    onRegisterControls({
      flush: () => {},
      isBusy: () => uploadingRef.current,
    });
    return () => onRegisterControls(null);
  }, [onRegisterControls]);

  useEffect(() => {
    setRemovedFileSnapshot(null);
  }, [section.tempId]);

  useEffect(() => () => {
    releaseMaterialFileUploadLock(section.tempId);
  }, [section.tempId]);

  const applyFile = useCallback(
    async (file) => {
      if (!file || disabled || uploadingRef.current || uploading) return;

      if (isMaterialFileUploadBlocked(section.tempId)) {
        setFileTypeError('Đang có học liệu khác tải file lên. Vui lòng đợi hoàn tất.');
        return;
      }

      const hasCompletedUpload = Boolean(
        String(section.AudioUrl ?? '').trim()
        && section.FileName
        && !section.File,
      );
      if (hasCompletedUpload) {
        setFileTypeError('Vui lòng xóa file hiện tại trước khi tải file mới.');
        return;
      }

      const fileCheck = validateListeningAudioFile(file);
      if (!fileCheck.ok) {
        setFileTypeError(fileCheck.message);
        return;
      }

      if (!tryAcquireMaterialFileUploadLock(section.tempId)) {
        setFileTypeError('Đang có học liệu khác tải file lên. Vui lòng đợi hoàn tất.');
        return;
      }

      const seq = ++uploadSeqRef.current;
      uploadingRef.current = true;
      setFileTypeError('');
      setUploadError('');
      setUploading(true);
      setUploadProgress(0);
      setRemovedFileSnapshot(null);
      onChange({
        AudioSourceType: LISTENING_SOURCE_UPLOAD,
        File: file,
        FileName: file.name,
        FileSize: file.size,
        AudioUrl: '',
      });

      try {
        const uploaded = await uploadAudioMaterial(file, {
          onProgress: (percent) => {
            if (seq !== uploadSeqRef.current) return;
            setUploadProgress(percent);
          },
        });
        if (seq !== uploadSeqRef.current) return;

        onChange({
          AudioSourceType: LISTENING_SOURCE_UPLOAD,
          File: null,
          FileName: uploaded.fileName ?? file.name,
          FileSize: uploaded.fileSize ?? file.size,
          AudioUrl: uploaded.deliveryUrl ?? uploaded.url ?? '',
        });
      } catch (error) {
        if (seq !== uploadSeqRef.current) return;
        setUploadError(error?.message || LISTENING_UPLOAD_FAILED_MESSAGE);
        onChange({
          File: null,
          FileName: null,
          FileSize: null,
          AudioUrl: '',
        });
      } finally {
        if (seq === uploadSeqRef.current) {
          uploadingRef.current = false;
          releaseMaterialFileUploadLock(section.tempId);
          setUploading(false);
          setUploadProgress(0);
        }
      }
    },
    [disabled, onChange, section.AudioUrl, section.File, section.FileName, section.tempId, uploading],
  );

  const handleFileInputChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 1) {
      setFileTypeError('Chỉ được tải lên 1 file mỗi lần.');
      event.target.value = '';
      return;
    }
    const file = files?.[0];
    if (file) applyFile(file);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    if (isBusy) return;
    const files = event.dataTransfer.files;
    if (!files?.length) return;
    if (files.length > 1) {
      setFileTypeError('Chỉ được tải lên 1 file mỗi lần.');
      return;
    }
    applyFile(files[0]);
  };

  const handleRemoveFile = () => {
    if (hasFile && !hasLink) {
      setRemovedFileSnapshot({
        File: section.File ?? null,
        FileName: section.FileName ?? null,
        FileSize: section.FileSize ?? null,
        AudioUrl: section.AudioUrl ?? '',
        AudioSourceType: section.AudioSourceType ?? LISTENING_SOURCE_UPLOAD,
      });
    }

    uploadSeqRef.current += 1;
    uploadingRef.current = false;
    releaseMaterialFileUploadLock(section.tempId);
    setFileTypeError('');
    setUploadError('');
    setUploading(false);
    setUploadProgress(0);
    onChange({
      File: null,
      FileName: null,
      FileSize: null,
      AudioUrl: hasLink ? audioUrl : '',
      AudioSourceType: hasLink ? LISTENING_SOURCE_LINK : LISTENING_SOURCE_UPLOAD,
    });
  };

  const handleRestoreFile = () => {
    if (!removedFileSnapshot) return;

    uploadSeqRef.current += 1;
    setFileTypeError('');
    setUploadError('');
    setUploading(false);
    setUploadProgress(0);
    onChange({
      File: removedFileSnapshot.File ?? null,
      FileName: removedFileSnapshot.FileName ?? null,
      FileSize: removedFileSnapshot.FileSize ?? null,
      AudioUrl: removedFileSnapshot.AudioUrl ?? '',
      AudioSourceType: removedFileSnapshot.AudioSourceType ?? LISTENING_SOURCE_UPLOAD,
    });
    setRemovedFileSnapshot(null);
  };

  const handleLinkChange = (event) => {
    const nextUrl = event.target.value;
    if (nextUrl.trim()) {
      const linkCheck = validateListeningAudioUrl(nextUrl);
      if (!linkCheck.ok) {
        setFileTypeError(linkCheck.message);
      } else {
        setFileTypeError('');
      }
      onChange({
        AudioUrl: nextUrl,
        AudioSourceType: LISTENING_SOURCE_LINK,
        File: null,
        FileName: null,
        FileSize: null,
      });
      setRemovedFileSnapshot(null);
      setUploadError('');
      return;
    }
    setFileTypeError('');
    onChange({
      AudioUrl: '',
      AudioSourceType: LISTENING_SOURCE_UPLOAD,
    });
    setRemovedFileSnapshot(null);
  };

  const fileError = fileTypeError || uploadError || errors.File;
  const linkError = errors.AudioUrl;
  const contextError = errors._audio;
  const hasError = Boolean(fileError || linkError || contextError);
  const showPreview = Boolean(audioUrl) && !uploading && (hasUploadedMedia || hasLink);
  const showRestoreFile = Boolean(removedFileSnapshot) && !hasFile && !hasLink;

  return (
    <Box sx={{ mb: 1.5 }}>
      <ContentFieldLabel sx={{ mb: 0.5, fontSize: 12, fontWeight: 700, color: '#64748B' }}>
        File Audio
      </ContentFieldLabel>

      <Box
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isBusy && !hasFile) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy && !hasFile) setDragOver(true);
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
        {hasFile && !hasLink ? (
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
                  {displayFileName || 'Đang tải file...'}
                </Typography>
                <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.1 }}>
                  {uploading
                    ? `Đang tải lên Cloudinary... ${uploadProgress}%`
                    : displayFileSize != null
                      ? formatFileSize(displayFileSize)
                      : ''}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={handleRemoveFile}
                disabled={isBusy}
                aria-label="Xóa file audio"
                sx={{ color: MUTED, '&:hover': { color: '#DC2626' } }}
              >
                <CloseRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Box>
            {uploading ? (
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: '999px',
                  bgcolor: 'rgba(15,23,42,0.08)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: '999px',
                    bgcolor: accentColor,
                  },
                }}
              />
            ) : null}
            {showPreview ? (
              <ListeningPreview sourceUrl={audioUrl} fileName={displayFileName} />
            ) : null}
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                  Kéo thả hoặc chọn file MP3 / MP4
                </Typography>
                <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.1 }}>
                  {FORMAT_HINT} · Tối đa {getListeningAudioMaxSizeLabel()}
                </Typography>
              </Box>
              <Box
                component="button"
                type="button"
                disabled={isBusy}
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
                  cursor: isBusy ? 'default' : 'pointer',
                  opacity: isBusy ? 0.6 : 1,
                  flexShrink: 0,
                  '&:hover': isBusy ? undefined : { bgcolor: 'rgba(15,23,42,0.04)' },
                }}
              >
                Chọn file
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple={false}
                accept={LISTENING_AUDIO_FILE_ACCEPT}
                disabled={isBusy}
                onChange={handleFileInputChange}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.85 }}>
              <Divider sx={{ flex: 1, borderColor: 'rgba(15,23,42,0.08)' }} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, flexShrink: 0 }}>
                hoặc
              </Typography>
              <Divider sx={{ flex: 1, borderColor: 'rgba(15,23,42,0.08)' }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LinkRoundedIcon
                sx={{ fontSize: 16, color: hasLink ? accentColor : MUTED, flexShrink: 0 }}
              />
              <InputBase
                value={audioUrl}
                onChange={handleLinkChange}
                disabled={disabled}
                placeholder="Dán link MP3, MP4 hoặc video nghe (YouTube, ...)"
                fullWidth
                sx={contentInputSx(Boolean(linkError), { color: accentColor })}
              />
            </Box>

            {hasLink && showPreview ? (
              <ListeningPreview sourceUrl={audioUrl} fileName={displayFileName} />
            ) : null}

            {showRestoreFile ? (
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <Box
                  component="button"
                  type="button"
                  disabled={isBusy}
                  onClick={handleRestoreFile}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                    px: 1.25,
                    py: 0.55,
                    borderRadius: '999px',
                    border: `1px solid ${accentColor}44`,
                    bgcolor: `${accentColor}10`,
                    color: accentColor,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: isBusy ? 'default' : 'pointer',
                    opacity: isBusy ? 0.6 : 1,
                    '&:hover': isBusy ? undefined : { bgcolor: `${accentColor}18` },
                  }}
                >
                  Khôi phục file cũ
                </Box>
              </Box>
            ) : null}
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
