import { Box, Typography } from '@mui/material';
import {
  PAGE_DESCRIPTION_SX,
  PAGE_TITLE_SX,
} from '@/features/mentor/components/course/mentorCourseCreateStyles';

export default function MentorPageShell({ title, description, children }) {
  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Typography component="h1" sx={{ ...PAGE_TITLE_SX, mb: 0.75 }}>
        {title}
      </Typography>
      <Typography sx={{ ...PAGE_DESCRIPTION_SX, mb: 2.5 }}>
        {description}
      </Typography>
      {children}
    </Box>
  );
}
