import { useRef, useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AppButton from '@/shared/ui/AppButton';
import { toast } from '@/shared/ui/Toast';
import {
  readImageFileAsDataUrl,
  resolveCourseThumbnailUrl,
  validateImageFile,
} from '@/features/mentor/utils/mentorCourseImageUtils';
import MentorCourseImageCropDialog from './MentorCourseImageCropDialog';
import { MUTED, PRIMARY, SECTION_TITLE_SX } from './mentorCourseCreateStyles';

export default function MentorCourseImageBox({
  value,
  error,
  onChange,
  disabled,
  title = 'Ảnh đại diện khóa học',
}) {
  const inputRef = useRef(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [draftImage, setDraftImage] = useState('');

  const thumbnail = String(value ?? '').trim();
  const hasImage = Boolean(thumbnail);
  const displayUrl = resolveCourseThumbnailUrl(thumbnail);

  const emitThumbnail = (nextValue) => {
    onChange({ target: { name: 'Thumbnail', value: nextValue } });
  };

  const handlePickFile = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setDraftImage(dataUrl);
      setCropOpen(true);
    } catch {
      toast.error('Không thể đọc file ảnh. Vui lòng thử lại.');
    }
  };

  const handleRemove = () => {
    emitThumbnail('');
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Typography sx={SECTION_TITLE_SX}>{title}</Typography>

      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <Box
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handlePickFile}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handlePickFile();
            }
          }}
          sx={{
            width: '100%',
            aspectRatio: '4 / 3',
            borderRadius: '14px',
            overflow: 'hidden',
            mb: 1.25,
            bgcolor: alpha(PRIMARY, 0.08),
            border: `1px dashed ${hasImage ? 'rgba(15,23,42,0.08)' : alpha(PRIMARY, 0.35)}`,
            display: 'grid',
            placeItems: 'center',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            backgroundImage: hasImage ? `url(${displayUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            ...(!disabled && {
              '&:hover': {
                borderColor: alpha(PRIMARY, 0.55),
                boxShadow: `0 0 0 3px ${alpha(PRIMARY, 0.08)}`,
              },
            }),
          }}
        >
          {!hasImage && (
            <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 32, color: PRIMARY }} />
          )}
        </Box>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleFileChange}
        />

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1,
            width: '100%',
          }}
        >
          <AppButton
            type="button"
            variant="outlined"
            size="small"
            onClick={handlePickFile}
            disabled={disabled}
            sx={{
              minWidth: 0,
              px: 1.5,
              height: 34,
              fontSize: 12,
              fontWeight: 700,
              borderRadius: '999px',
            }}
          >
            {hasImage ? 'Thay ảnh' : 'Tải ảnh lên'}
          </AppButton>
          {hasImage && (
            <AppButton
              type="button"
              variant="text"
              size="small"
              onClick={handleRemove}
              disabled={disabled}
              sx={{ minWidth: 0, px: 1, height: 34, fontSize: 12, fontWeight: 600 }}
            >
              Xóa
            </AppButton>
          )}
        </Box>

        {error ? (
          <Typography
            sx={{
              fontSize: 11,
              color: '#DC2626',
              mt: 0.75,
              lineHeight: 1.3,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {error}
          </Typography>
        ) : (
          <Typography
            sx={{
              fontSize: 11,
              color: MUTED,
              mt: 0.75,
              lineHeight: 1.45,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {hasImage ? (
              <>
                <MenuBookOutlinedIcon sx={{ fontSize: 12, mr: 0.35, verticalAlign: '-2px' }} />
                Ảnh ngang, tối đa 5MB.
              </>
            ) : (
              'JPG, PNG hoặc WEBP. Tối đa 5MB.'
            )}
          </Typography>
        )}
      </Box>

      <MentorCourseImageCropDialog
        open={cropOpen}
        imageSrc={draftImage}
        onClose={() => setCropOpen(false)}
        onSave={emitThumbnail}
      />
    </Box>
  );
}
