import { Box, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

export default function AdminNewsDraftSaveStatus({ saved }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        pt: 2,
        mt: 2,
        borderTop: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      {saved ? (
        <>
          <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#059669', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#059669', lineHeight: 1.4 }}>
            Đã lưu nháp
          </Typography>
        </>
      ) : (
        <>
          <CloudOffOutlinedIcon sx={{ fontSize: 16, color: MUTED, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: MUTED, lineHeight: 1.4 }}>
            Chưa lưu nháp
          </Typography>
        </>
      )}
    </Box>
  );
}
