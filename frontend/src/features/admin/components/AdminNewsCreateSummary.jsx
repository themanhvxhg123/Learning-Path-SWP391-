import { Box, Chip, Typography } from '@mui/material';
import { CategoryNameChip } from '@/shared/catalog/CatalogNameChip';
import {
  ADMIN_NEWS_STATUS_CHIP_SX,
  ADMIN_NEWS_STATUS_LABELS,
} from '@/features/admin/utils/adminNewsUtils';
import { resolveCourseThumbnailUrl } from '@/features/mentor/utils/mentorCourseImageUtils';
import { CREATE_CARD_SX, MUTED, TEXT } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PILL_CHIP_SX = {
  borderRadius: '999px',
  height: 24,
  fontSize: 12,
  fontWeight: 700,
  '& .MuiChip-label': { px: 1.2, fontWeight: 700 },
};

function SummaryField({ label, children }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.35 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

export default function AdminNewsCreateSummary({ step1, categoryLabel, footer = null }) {
  if (!step1) return null;

  const statusSx = ADMIN_NEWS_STATUS_CHIP_SX[step1.status] ?? ADMIN_NEWS_STATUS_CHIP_SX.DRAFT;
  const thumbnailUrl = resolveCourseThumbnailUrl(step1.thumbnail);

  return (
    <Box
      sx={{
        ...CREATE_CARD_SX,
        position: { lg: 'sticky' },
        top: { lg: 88 },
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: TEXT, mb: 1.5 }}>
        Thông tin bài viết
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {thumbnailUrl ? (
          <SummaryField label="Thumbnail">
            <Box
              component="img"
              src={thumbnailUrl}
              alt=""
              sx={{
                width: '100%',
                maxWidth: 220,
                aspectRatio: '4 / 3',
                objectFit: 'cover',
                borderRadius: '10px',
                border: '1px solid rgba(15,23,42,0.08)',
              }}
            />
          </SummaryField>
        ) : null}

        <SummaryField label="Tiêu đề">
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: TEXT, lineHeight: 1.45 }}>
            {step1.title || '—'}
          </Typography>
        </SummaryField>

        <SummaryField label="Danh mục">
          {categoryLabel ? (
            <CategoryNameChip label={categoryLabel} id={step1.categoryId} />
          ) : (
            <Typography sx={{ fontSize: 13, color: MUTED }}>—</Typography>
          )}
        </SummaryField>

        <SummaryField label="Trạng thái">
          <Chip
            size="small"
            label={ADMIN_NEWS_STATUS_LABELS[step1.status] ?? step1.status}
            sx={{ ...PILL_CHIP_SX, ...statusSx }}
          />
        </SummaryField>

        <SummaryField label="Tác giả">
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: TEXT }}>
            {step1.author || '—'}
          </Typography>
        </SummaryField>

        {step1.excerpt ? (
          <SummaryField label="Mô tả ngắn">
            <Typography sx={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
              {step1.excerpt}
            </Typography>
          </SummaryField>
        ) : null}
      </Box>

      {footer}
    </Box>
  );
}
