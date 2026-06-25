import { Box, Chip, Typography } from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import { CategoryNameChip } from '@/shared/catalog/CatalogNameChip';
import AdminCatalogEditButton from '@/features/admin/components/AdminCatalogEditButton';
import {
  ADMIN_NEWS_STATUS_CHIP_SX,
  ADMIN_NEWS_STATUS_LABELS,
  ADMIN_NEWS_TABLE_GRID_COLUMNS,
  formatNewsDate,
} from '@/features/admin/utils/adminNewsUtils';
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PILL_CHIP_SX = {
  borderRadius: '999px',
  height: 24,
  fontSize: 12,
  fontWeight: 700,
  '& .MuiChip-label': { px: 1.2, fontWeight: 700 },
};

const VALUE_SX = {
  fontSize: 13,
  fontWeight: 500,
  color: TEXT,
  lineHeight: 1.45,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function MobileField({ label, children }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25 }}>{label}</Typography>
      {children}
    </Box>
  );
}

function DesktopValue({ value }) {
  return (
    <Typography sx={{ ...VALUE_SX, display: { xs: 'none', md: 'block' } }}>{value}</Typography>
  );
}

function NewsThumbnail({ item }) {
  if (item.thumbnail) {
    return (
      <Box
        component="img"
        src={item.thumbnail}
        alt=""
        sx={{
          width: 44,
          height: 44,
          borderRadius: '10px',
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid rgba(15,23,42,0.08)',
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '10px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(8,145,178,0.08)',
        border: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      <ArticleRoundedIcon sx={{ fontSize: 20, color: '#0891B2' }} />
    </Box>
  );
}

export default function AdminNewsRow({ article, onEdit }) {
  const statusSx = ADMIN_NEWS_STATUS_CHIP_SX[article.status] ?? ADMIN_NEWS_STATUS_CHIP_SX.DRAFT;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: ADMIN_NEWS_TABLE_GRID_COLUMNS },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 1.25, md: 2 },
        px: { xs: 2, sm: 2.25 },
        py: { xs: 2, md: 1.75 },
        borderBottom: '1px solid rgba(15,23,42,0.06)',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <NewsThumbnail item={article} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <MobileField label="Tiêu đề">
            <Typography sx={{ ...VALUE_SX, fontWeight: 600, whiteSpace: 'normal' }}>
              {article.title}
            </Typography>
          </MobileField>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: TEXT,
              lineHeight: 1.4,
              display: { xs: 'none', md: '-webkit-box' },
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {article.title}
          </Typography>
          {article.excerpt ? (
            <Typography
              sx={{
                fontSize: 12,
                color: MUTED,
                mt: 0.35,
                lineHeight: 1.45,
                display: { xs: 'none', md: '-webkit-box' },
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {article.excerpt}
            </Typography>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <MobileField label="Danh mục">
          {article.category ? (
            <CategoryNameChip
              label={article.category}
              id={article.categoryId}
            />
          ) : (
            <Typography sx={VALUE_SX}>—</Typography>
          )}
        </MobileField>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          {article.category ? (
            <CategoryNameChip
              label={article.category}
              id={article.categoryId}
              sx={{ fontSize: 13 }}
            />
          ) : (
            <Typography sx={VALUE_SX}>—</Typography>
          )}
        </Box>
      </Box>

      <Box>
        <MobileField label="Trạng thái">
          <Chip
            size="small"
            label={ADMIN_NEWS_STATUS_LABELS[article.status] ?? article.status}
            sx={{ ...PILL_CHIP_SX, ...statusSx }}
          />
        </MobileField>
        <Chip
          size="small"
          label={ADMIN_NEWS_STATUS_LABELS[article.status] ?? article.status}
          sx={{
            ...PILL_CHIP_SX,
            ...statusSx,
            display: { xs: 'none', md: 'inline-flex' },
          }}
        />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <MobileField label="Ngày đăng">
          <Typography sx={VALUE_SX}>{formatNewsDate(article.publishedAt)}</Typography>
        </MobileField>
        <DesktopValue value={formatNewsDate(article.publishedAt)} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <MobileField label="Ngày cập nhật">
          <Typography sx={VALUE_SX}>{formatNewsDate(article.updatedAt)}</Typography>
        </MobileField>
        <DesktopValue value={formatNewsDate(article.updatedAt)} />
      </Box>

      <AdminCatalogEditButton
        ariaLabel="Chỉnh sửa tin tức"
        title="Chỉnh sửa tin tức"
        onClick={() => onEdit?.(article)}
      />
    </Box>
  );
}
