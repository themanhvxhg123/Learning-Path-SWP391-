import { Box, Chip, Typography, alpha } from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Link } from 'react-router-dom';
import { resolveCategoryChipSx } from '@/shared/catalog/catalogRegistry';
import { formatNewsDate } from '@/features/admin/utils/adminNewsUtils';
import { buildNewsDetailPath } from '@/features/news/utils/newsListParams';
import ThumbnailImage from '@/shared/ui/ThumbnailImage';

const PRIMARY = '#0891B2';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = 'rgba(8,145,178,0.09)';

function CategoryChip({ category }) {
  const style = resolveCategoryChipSx({ displayName: category }, { withBorder: false });
  return (
    <Chip
      label={category}
      size="small"
      sx={{
        ...style,
        fontSize: 11,
        fontWeight: 600,
        height: 22,
        borderRadius: '6px',
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

export default function NewsCard({ article, listSearchParams }) {
  const detailPath = buildNewsDetailPath(article.id, listSearchParams);
  const displayDate = formatNewsDate(article.publishedAt || article.updatedAt);

  return (
    <Box
      component={Link}
      to={detailPath}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: '18px',
        border: `1px solid ${BORDER}`,
        bgcolor: '#fff',
        overflow: 'hidden',
        height: '100%',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 32px rgba(8,145,178,0.09)',
        },
      }}
    >
      <ThumbnailImage
        src={article.thumbnail}
        label={article.title}
        alt={article.title}
        iconSize={36}
        sx={{ height: 180, width: '100%' }}
        imgSx={{
          transition: 'transform 0.4s ease',
          '.MuiBox-root:hover &': { transform: 'scale(1.04)' },
        }}
      />

      <Box sx={{ p: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
          {article.category ? <CategoryChip category={article.category} /> : null}
          {article.author ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonOutlineOutlinedIcon sx={{ fontSize: 11, color: MUTED }} />
              <Typography sx={{ fontSize: 11, color: MUTED }}>{article.author}</Typography>
            </Box>
          ) : null}
          {displayDate !== '—' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: MUTED }} />
              <Typography sx={{ fontSize: 11, color: MUTED }}>{displayDate}</Typography>
            </Box>
          ) : null}
        </Box>

        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.35,
            mb: 0.875,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.title}
        </Typography>

        <Typography
          sx={{
            fontSize: 13,
            color: MUTED,
            lineHeight: 1.6,
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.excerpt}
        </Typography>

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: 13,
            fontWeight: 600,
            color: PRIMARY,
          }}
        >
          Đọc thêm
          <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
    </Box>
  );
}
