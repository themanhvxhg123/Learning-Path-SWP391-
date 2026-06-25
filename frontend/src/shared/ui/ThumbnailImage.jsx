import { useEffect, useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import { resolveThumbnailUrl } from '@/shared/utils/thumbnailUtils';

const PRIMARY = '#0891B2';

function ThumbnailPlaceholder({ icon: Icon = MenuBookOutlinedIcon, label, iconSize = 28, sx }) {
  const initial = label ? String(label).trim().charAt(0).toUpperCase() : null;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(145deg, ${alpha(PRIMARY, 0.14)} 0%, ${alpha(PRIMARY, 0.05)} 55%, rgba(255,255,255,0.65) 100%)`,
        position: 'relative',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 120,
          height: 120,
          borderRadius: '50%',
          bgcolor: alpha(PRIMARY, 0.08),
          top: -30,
          right: -20,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(PRIMARY, 0.06),
          bottom: -20,
          left: -10,
        }}
      />
      <Box
        sx={{
          position: 'relative',
          width: iconSize + 24,
          height: iconSize + 24,
          borderRadius: initial ? '16px' : '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(PRIMARY, 0.12),
          border: `1px solid ${alpha(PRIMARY, 0.18)}`,
          boxShadow: `0 4px 14px ${alpha(PRIMARY, 0.12)}`,
        }}
      >
        {initial ? (
          <Typography
            sx={{
              fontSize: Math.round(iconSize * 0.55),
              fontWeight: 800,
              color: PRIMARY,
              lineHeight: 1,
            }}
          >
            {initial}
          </Typography>
        ) : (
          <Icon sx={{ fontSize: iconSize, color: PRIMARY }} />
        )}
      </Box>
    </Box>
  );
}

/**
 * Thumbnail với placeholder đẹp khi thiếu ảnh hoặc load lỗi.
 */
export default function ThumbnailImage({
  src,
  alt = '',
  label,
  cacheKey,
  icon,
  iconSize,
  sx,
  imgSx,
  placeholderSx,
}) {
  const imageUrl = resolveThumbnailUrl(src, cacheKey);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const showPlaceholder = !imageUrl || failed;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: alpha(PRIMARY, 0.06),
        ...sx,
      }}
    >
      {showPlaceholder ? (
        <ThumbnailPlaceholder
          icon={icon}
          label={label}
          iconSize={iconSize}
          sx={placeholderSx}
        />
      ) : (
        <Box
          component="img"
          src={imageUrl}
          alt={alt || label || 'Thumbnail'}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            ...imgSx,
          }}
        />
      )}
    </Box>
  );
}
