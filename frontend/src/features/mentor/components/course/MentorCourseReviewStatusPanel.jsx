import { Box, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import MentorCourseReviewActions from './MentorCourseReviewActions';
import { BUILDER_PANEL_SX } from './mentorCourseContentStyles';
import { CARD_SECTION_TITLE_SX, MUTED, TEXT } from './mentorCourseCreateStyles';

function StatusIcon({ status }) {
  if (status === 'ok') {
    return <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#059669', flexShrink: 0 }} />;
  }
  if (status === 'warning') {
    return <WarningAmberRoundedIcon sx={{ fontSize: 18, color: '#D97706', flexShrink: 0 }} />;
  }
  return <ErrorOutlineRoundedIcon sx={{ fontSize: 18, color: '#DC2626', flexShrink: 0 }} />;
}

function OverviewPill({ label, value }) {
  return (
    <Box
      sx={{
        px: 1.1,
        py: 0.75,
        borderRadius: '999px',
        bgcolor: 'rgba(15,23,42,0.04)',
        border: '1px solid rgba(15,23,42,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Typography sx={{ fontSize: 12, color: MUTED }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{value}</Typography>
    </Box>
  );
}

export default function MentorCourseReviewStatusPanel({
  checklist = [],
  validation,
  overview,
  onCreate,
  creating = false,
  showActions = true,
}) {
  const errorChecklist = checklist.reduce((sumErr, err) => {
    if (err.status === true) {
      sumErr++;
    }

    return sumErr;
  }, 0);
  const errorValidation = validation?.errors?.length ?? 0
  const errorCount = Number(errorChecklist + errorValidation);
  const isValid = validation?.isValid;
  const isValidCheckList = checklist.every((c) => c.status === true);
  return (
    <Box
      sx={{
        position: { lg: 'sticky' },
        top: { lg: 24 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ ...BUILDER_PANEL_SX, p: 2 }}>
        <Typography sx={{ ...CARD_SECTION_TITLE_SX, mb: 1.25 }}>
          Trạng thái kiểm tra
        </Typography>

        <Box
          sx={{
            px: 1.25,
            py: 1,
            borderRadius: '12px',
            mb: 1.5,
            bgcolor: isValid ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.06)',
            border: `1px solid ${isValid ? 'rgba(5,150,105,0.18)' : 'rgba(220,38,38,0.15)'}`,
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              color: isValid ? '#059669' : '#DC2626',
              lineHeight: 1.5,
            }}
          >
            {isValid && isValidCheckList
              ? 'Khóa học đã sẵn sàng để tạo.'
              : `Còn ${errorCount} mục cần hoàn thiện`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85, mb: 2 }}>
          {checklist.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
              <StatusIcon status={item.status} />
              <Typography sx={{ fontSize: 13, color: TEXT, lineHeight: 1.45, fontWeight: 500 }}>
                <div className='d-flex'>
                  {item.label}
                </div>
              </Typography>
            </Box>
          ))}
        </Box>

        {!isValid && (validation?.errors ?? []).length > 0 && isValidCheckList && (
          <Box
            sx={{
              mb: 2,
              px: 1.1,
              py: 1,
              borderRadius: '12px',
              bgcolor: 'rgba(220,38,38,0.04)',
              border: '1px solid rgba(220,38,38,0.12)',
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            {(validation.errors ?? []).slice(0, 6).map((error) => (
              <Typography
                key={`${error.type}-${error.message}`}
                sx={{ fontSize: 12, color: '#B91C1C', lineHeight: 1.5, mb: 0.5 }}
              >
                • {error.message}
              </Typography>
            ))}
            {(validation.errors ?? []).length > 6 && (
              <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.25 }}>
                và {(validation.errors ?? []).length - 6} lỗi khác...
              </Typography>
            )}
          </Box>
        )}

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXT, mb: 1 }}>
          Tổng quan
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <OverviewPill label="Chương" value={overview.chapters} />
          <OverviewPill label="Bài học" value={overview.lessons} />
          <OverviewPill label="Học liệu" value={overview.materials} />
        </Box>
      </Box>

      {showActions && (
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <MentorCourseReviewActions onCreate={onCreate} creating={creating} />
        </Box>
      )}
    </Box>
  );
}
