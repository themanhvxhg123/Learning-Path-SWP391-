import { Box, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useNavigate } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import { COURSE_THUMBNAIL_ASPECT, CREATE_CARD_SX, MUTED, TEXT } from './mentorCourseCreateStyles';
import MentorCardSectionTitle from './MentorCardSectionTitle';
import { resolveCourseThumbnailUrl } from '@/features/mentor/utils/mentorCourseImageUtils';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: TEXT, lineHeight: 1.5 }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default function MentorCourseInfoReview({
  course,
  categoryLabel,
  levelLabel,
}) {
  const navigate = useNavigate();
  const thumbnail = String(course?.Thumbnail ?? '').trim();
  const thumbnailUrl = resolveCourseThumbnailUrl(thumbnail);
  const isPublished = Boolean(course?.IsPublished);

  return (
    <Box sx={CREATE_CARD_SX}>
      <MentorCardSectionTitle
        title="Thông tin khóa học"
        action={
          <AppButton
            variant="outlined"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/mentor/courses/create')}
            sx={{
              height: 34,
              borderRadius: '999px',
              fontSize: 12,
              fontWeight: 600,
              px: 1.5,
              flexShrink: 0,
            }}
          >
            Chỉnh sửa thông tin
          </AppButton>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0, 1fr)' },
          gap: 2.5,
        }}
      >
        <Box
          sx={{
            width: '100%',
            aspectRatio: String(COURSE_THUMBNAIL_ASPECT),
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: 'rgba(15,23,42,0.04)',
            border: '1px solid rgba(15,23,42,0.08)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {thumbnail ? (
            <Box
              component="img"
              src={thumbnailUrl}
              alt="Ảnh đại diện khóa học"
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ fontSize: 13, color: MUTED, px: 2, textAlign: 'center' }}>
              Chưa có ảnh đại diện
            </Typography>
          )}
        </Box>

        <Box>
          <InfoRow label="Tên khóa học" value={course?.CourseName || 'Chưa đặt tên'} />
          <InfoRow
            label="Mô tả"
            value={course?.Description || 'Chưa có mô tả'}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            <InfoRow label="Danh mục" value={categoryLabel || 'Chưa chọn'} />
            <InfoRow label="Trình độ" value={levelLabel || 'Chưa chọn'} />
          </Box>
          <InfoRow
            label="Trạng thái dự kiến"
            value={isPublished ? 'Xuất bản' : 'Bản nháp'}
          />
        </Box>
      </Box>
    </Box>
  );
}
