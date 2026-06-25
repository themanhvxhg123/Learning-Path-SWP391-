import { Box, Typography } from '@mui/material';
import {
  CARD_SECTION_TITLE_SX,
  PRIMARY,
} from './mentorCourseCreateStyles';

export default function MentorCardSectionTitle({
  title,
  accent = true,
  action = null,
  mb = 2,
  sx,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        mb,
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        {accent ? (
          <Box
            sx={{
              width: 3,
              height: 16,
              borderRadius: '999px',
              bgcolor: PRIMARY,
              flexShrink: 0,
            }}
          />
        ) : null}
        <Typography sx={CARD_SECTION_TITLE_SX}>{title}</Typography>
      </Box>
      {action}
    </Box>
  );
}
