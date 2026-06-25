import { Box, Typography } from '@mui/material';
import {
  COURSE_THUMBNAIL_ASPECT,
  CREATE_CARD_SX,
  MUTED,
  TEXT,
} from './mentorCourseCreateStyles';import MentorCardSectionTitle from './MentorCardSectionTitle';
import ThumbnailImage from '@/shared/ui/ThumbnailImage';
import { formatMentorCourseDate, isCoursePublished } from '@/features/mentor/utils/mentorCourseUtils';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25, lineHeight: 1.35 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: TEXT, lineHeight: 1.5 }}>
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

export default function MentorCourseOverviewTab({ course }) {
  const published = isCoursePublished(course);

  return (
    <Box sx={CREATE_CARD_SX}>
      <MentorCardSectionTitle title="Thông tin khóa học" />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0, 1fr)' },
          gap: 2.5,
        }}
      >
        <ThumbnailImage
          src={course.Thumbnail}
          label={course.CourseName}
          alt={course.CourseName}
          cacheKey={course.CourseUpdateAt ?? course.UpdatedAt ?? course.CourseCreateAt}
          iconSize={40}
          sx={{
            width: '100%',
            aspectRatio: String(COURSE_THUMBNAIL_ASPECT),
            borderRadius: '16px',
            border: '1px solid rgba(15,23,42,0.08)',
          }}
        />

        <Box>
          <InfoRow label="Tên khóa học" value={course.CourseName} />
          <InfoRow label="Mô tả" value={course.Description || '—'} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 0,
            }}
          >
            <InfoRow label="Danh mục" value={course.CategoryDisplayName} />
            <InfoRow label="Trình độ" value={course.LevelDisplayName} />
            <InfoRow label="Giảng viên" value={course.InStructorName} />
            <InfoRow
              label="Trạng thái"
              value={published ? 'Đã xuất bản' : 'Bản nháp'}
            />
            <InfoRow label="Ngày tạo" value={formatMentorCourseDate(course.CourseCreateAt)} />
            <InfoRow label="Cập nhật gần nhất" value={formatMentorCourseDate(course.CourseUpdateAt)} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
