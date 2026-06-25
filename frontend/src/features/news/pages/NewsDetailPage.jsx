import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Chip,
  Link as MuiLink,
  Typography,
  alpha,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppButton from '@/shared/ui/AppButton';
import Loading from '@/shared/ui/Loading';
import EmptyState from '@/shared/ui/EmptyState';
import { fetchPublishedNewsArticleById } from '@/features/news/services/newsService';
import { formatNewsDate } from '@/features/admin/utils/adminNewsUtils';
import { buildNewsListPath } from '@/features/news/utils/newsListParams';
import { resolveCategoryChipSx } from '@/shared/catalog/catalogRegistry';

const PRIMARY = '#0891B2';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = 'rgba(8,145,178,0.09)';

const ARTICLE_CONTENT_SX = {
  fontSize: 15,
  color: TEXT,
  lineHeight: 1.75,
  '& p': { mb: 1.5 },
  '& ul, & ol': { pl: 2.5, mb: 1.5 },
  '& li': { mb: 0.5 },
  '& strong': { fontWeight: 700 },
  '& a': { color: PRIMARY, textDecoration: 'underline' },
  '& img': { maxWidth: '100%', borderRadius: '12px' },
};

export default function NewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backPath = useMemo(() => {
    const from = searchParams.get('from');
    return buildNewsListPath(from);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadArticle() {
      setLoading(true);
      setError(null);
      const result = await fetchPublishedNewsArticleById(id);
      if (cancelled) return;

      if (!result.ok || !result.article) {
        setArticle(null);
        setError(result.message ?? 'Không tìm thấy tin tức.');
      } else {
        setArticle(result.article);
      }
      setLoading(false);
    }

    loadArticle();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
        <Loading message="Đang tải bài viết..." />
      </Box>
    );
  }

  if (error || !article) {
    return (
      <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
        <EmptyState
          variant="error"
          title="Không tìm thấy bài viết"
          description={error ?? 'Bài viết không tồn tại hoặc chưa được công bố.'}
          actionLabel="Quay lại tin tức"
          onAction={() => navigate(backPath)}
        />
      </Box>
    );
  }

  const categoryChipSx = resolveCategoryChipSx(
    { displayName: article.category },
    { withBorder: true },
  );
  const displayDate = formatNewsDate(article.publishedAt || article.updatedAt);

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          mb: 2,
        }}
      >
        <Breadcrumbs
          separator="/"
          sx={{
            flex: 1,
            minWidth: 0,
            '& .MuiBreadcrumbs-separator': { color: MUTED, mx: 0.5 },
            '& .MuiBreadcrumbs-li': { maxWidth: '100%' },
          }}
        >
          <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
            Trang chủ
          </MuiLink>
          <MuiLink component={Link} to={backPath} underline="hover" sx={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>
            Tin tức
          </MuiLink>
          <Typography
            sx={{
              fontSize: 13,
              color: TEXT,
              fontWeight: 600,
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={article.title}
          >
            {article.title}
          </Typography>
        </Breadcrumbs>

        <AppButton
          variant="outlined"
          startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigate(backPath)}
          sx={{
            height: 36,
            px: 1.75,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: '999px',
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            color: TEXT,
            borderColor: 'rgba(15,23,42,0.12)',
          }}
        >
          Quay lại danh sách
        </AppButton>
      </Box>

      <Box
        sx={{
          borderRadius: '18px',
          border: `1px solid ${BORDER}`,
          bgcolor: '#fff',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: { xs: 220, sm: 320 },
            overflow: 'hidden',
            bgcolor: alpha(PRIMARY, 0.05),
            position: 'relative',
          }}
        >
          {article.thumbnail ? (
            <Box
              component="img"
              src={article.thumbnail}
              alt={article.title}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MenuBookOutlinedIcon sx={{ fontSize: 56, color: alpha(PRIMARY, 0.28) }} />
            </Box>
          )}
        </Box>

        <Box sx={{ p: { xs: 2.25, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
            {article.category ? (
              <Chip
                label={article.category}
                size="small"
                sx={{
                  ...categoryChipSx,
                  fontSize: 11,
                  fontWeight: 600,
                  height: 24,
                  borderRadius: '6px',
                }}
              />
            ) : null}
            {displayDate !== '—' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: MUTED }} />
                <Typography sx={{ fontSize: 12.5, color: MUTED }}>{displayDate}</Typography>
              </Box>
            ) : null}
            {article.author ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonOutlineOutlinedIcon sx={{ fontSize: 14, color: MUTED }} />
                <Typography sx={{ fontSize: 12.5, color: MUTED }}>{article.author}</Typography>
              </Box>
            ) : null}
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 24, sm: 30 },
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              mb: 1.25,
            }}
          >
            {article.title}
          </Typography>

          {article.excerpt ? (
            <Typography
              sx={{
                fontSize: 15,
                color: MUTED,
                lineHeight: 1.65,
                mb: 2.5,
                pb: 2.5,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              {article.excerpt}
            </Typography>
          ) : null}

          {article.content ? (
            <Box
              sx={ARTICLE_CONTENT_SX}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <Typography sx={{ fontSize: 14, color: MUTED, fontStyle: 'italic' }}>
              Nội dung bài viết đang được cập nhật.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
