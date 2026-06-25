import { Box, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { MUTED, PRIMARY, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const STEPS = [
  { step: 1, label: 'Thông tin cơ bản' },
  { step: 2, label: 'Xây nội dung' },
];

export default function AdminNewsCreateStepIndicator({ currentStep = 1 }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        mb: 1.75,
      }}
    >
      {STEPS.map(({ step, label }, index) => {
        const done = step < currentStep;
        const active = step === currentStep;

        return (
          <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '999px',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  bgcolor: done || active ? PRIMARY : 'rgba(100,116,139,0.12)',
                  color: done || active ? '#fff' : MUTED,
                  border: active ? `2px solid ${PRIMARY}` : '2px solid transparent',
                  boxShadow: active ? '0 0 0 3px rgba(8,145,178,0.12)' : 'none',
                }}
              >
                {done ? <CheckRoundedIcon sx={{ fontSize: 13 }} /> : step}
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: 11, sm: 12 },
                  fontWeight: active ? 700 : 500,
                  color: active ? TEXT : done ? TEXT : MUTED,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Typography>
            </Box>
            {index < STEPS.length - 1 && (
              <Box
                sx={{
                  width: { xs: 16, sm: 28 },
                  height: 1,
                  bgcolor: step < currentStep ? PRIMARY : 'rgba(15,23,42,0.1)',
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
