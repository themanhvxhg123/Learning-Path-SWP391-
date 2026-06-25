import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { TEST_MUTED } from './testTheme';

function bareNavIconSx(enabled, accentColor) {
  return {
    width: 28,
    height: 28,
    p: 0,
    border: 'none',
    borderRadius: 0,
    bgcolor: 'transparent',
    boxShadow: 'none',
    color: enabled ? accentColor : TEST_MUTED,
    opacity: enabled ? 1 : 0.3,
    '&:hover': {
      bgcolor: 'transparent',
      boxShadow: 'none',
    },
    '&.Mui-disabled': {
      bgcolor: 'transparent',
      color: TEST_MUTED,
      opacity: 0.25,
    },
  };
}

export default function TestSectionToolbar({
  title,
  groupLabel,
  groupMeta,
  statusLabel = 'Đang làm',
  accentColor,
  accentBg,
  canGoBack = false,
  canGoNext = false,
  onBack,
  onNext,
}) {
  const showGroupNav = canGoBack || canGoNext;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mb: 2,
        px: 0.25,
      }}
    >
      <IconButton
        aria-label="Nhóm trước"
        onClick={onBack}
        disabled={!canGoBack}
        disableRipple
        sx={{
          ...bareNavIconSx(canGoBack, accentColor),
          opacity: showGroupNav ? (canGoBack ? 1 : 0.3) : 0,
          pointerEvents: showGroupNav ? 'auto' : 'none',
        }}
      >
        <ChevronLeftRoundedIcon sx={{ fontSize: 28, fontWeight: 300 }} />
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <Typography
          sx={{
            fontSize: { xs: 18, md: 20 },
            fontWeight: 800,
            color: accentColor,
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: TEST_MUTED, mt: 0.25 }}>
          {groupLabel}
          {groupMeta ? ` · ${groupMeta}` : ''}
        </Typography>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 700,
            color: accentColor,
            mt: 0.5,
            display: { xs: 'block', sm: 'none' },
          }}
        >
          {statusLabel}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            borderRadius: '999px',
            bgcolor: accentBg,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: accentColor }}>
            {statusLabel}
          </Typography>
        </Box>

        <IconButton
          aria-label="Nhóm sau"
          onClick={onNext}
          disabled={!canGoNext}
          disableRipple
          sx={{
            ...bareNavIconSx(canGoNext, accentColor),
            opacity: showGroupNav ? (canGoNext ? 1 : 0.3) : 0,
            pointerEvents: showGroupNav ? 'auto' : 'none',
          }}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: 28, fontWeight: 300 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
