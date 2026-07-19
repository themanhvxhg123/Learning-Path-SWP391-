import { Box, Switch, Tooltip, Typography } from '@mui/material';
import {
  isNodeActive,
  isPathActive,
} from '@/features/mentor/utils/mentorCourseContentUtils';
import { MUTED } from './mentorCourseCreateStyles';

export function PathPublishToggle({
  path,
  onChange,
  disabled = false,
  publishBlockReason = null,
  hideBlockReason = null,
}) {
  const published = isPathActive(path);
  const publishBlocked = !published && Boolean(publishBlockReason);
  const hideBlocked = published && Boolean(hideBlockReason);
  const switchDisabled = disabled || publishBlocked || hideBlocked;

  const toggle = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.35,
        borderRadius: '999px',
        bgcolor: published ? 'rgba(4,120,87,0.08)' : 'rgba(100,116,139,0.08)',
        border: `1px solid ${published ? 'rgba(4,120,87,0.2)' : 'rgba(15,23,42,0.08)'}`,
        flexShrink: 0,
        opacity: switchDisabled && !published ? 0.72 : 1,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: published ? '#047857' : MUTED }}>
        Xuất bản
      </Typography>
      <Switch
        size="small"
        checked={published}
        onChange={(event) => {
          if (published && !event.target.checked && hideBlockReason) return;
          onChange(path.tempId, { IsActive: event.target.checked ? 1 : 0 });
        }}
        disabled={switchDisabled}
        inputProps={{ 'aria-label': 'Xuất bản chương cho học viên' }}
        sx={{
          m: 0,
          '& .MuiSwitch-switchBase.Mui-checked': { color: '#047857' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#047857' },
        }}
      />
    </Box>
  );

  const blockReason = publishBlocked ? publishBlockReason : (hideBlocked ? hideBlockReason : null);
  if (blockReason) {
    return (
      <Tooltip title={blockReason} arrow placement="top">
        <span>{toggle}</span>
      </Tooltip>
    );
  }

  return toggle;
}

export function NodePublishToggle({
  node,
  onChange,
  disabled = false,
  publishBlockReason = null,
  hideBlockReason = null,
}) {
  const published = isNodeActive(node);
  const publishBlocked = !published && Boolean(publishBlockReason);
  const hideBlocked = published && Boolean(hideBlockReason);
  const switchDisabled = disabled || publishBlocked || hideBlocked;

  const toggle = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.35,
        borderRadius: '999px',
        bgcolor: published ? 'rgba(4,120,87,0.08)' : 'rgba(100,116,139,0.08)',
        border: `1px solid ${published ? 'rgba(4,120,87,0.2)' : 'rgba(15,23,42,0.08)'}`,
        flexShrink: 0,
        opacity: switchDisabled && !published ? 0.72 : 1,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: published ? '#047857' : MUTED }}>
        Xuất bản
      </Typography>
      <Switch
        size="small"
        checked={published}
        onChange={(event) => {
          if (published && !event.target.checked && hideBlockReason) return;
          onChange(node.tempId, { IsActive: event.target.checked ? 1 : 0 });
        }}
        disabled={switchDisabled}
        inputProps={{ 'aria-label': 'Xuất bản bài học cho học viên' }}
        sx={{
          m: 0,
          '& .MuiSwitch-switchBase.Mui-checked': { color: '#047857' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#047857' },
        }}
      />
    </Box>
  );

  const blockReason = publishBlocked ? publishBlockReason : (hideBlocked ? hideBlockReason : null);
  if (blockReason) {
    return (
      <Tooltip title={blockReason} arrow placement="top">
        <span>{toggle}</span>
      </Tooltip>
    );
  }

  return toggle;
}
