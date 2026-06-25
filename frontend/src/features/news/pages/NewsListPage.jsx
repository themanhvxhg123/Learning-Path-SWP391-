import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Grid,
  Link as MuiLink,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { Link, useSearchParams } from 'react-router-dom';
import Loading from '@/shared/ui/Loading';
import EmptyState from '@/shared/ui/EmptyState';
import NewsCard from '@/features/news/components/NewsCard';
import NewsCatalogToolbar from '@/features/news/components/NewsCatalogToolbar';
import NewsListPagination from '@/features/news/components/NewsListPagination';
import { fetchPublishedNewsArticles } from '@/features/news/services/newsService';
import { filterAndSortNews } from '@/features/admin/utils/adminNewsUtils';
import {
  buildNewsActiveChips,
  buildNewsCategoryFilterOptions,
  buildNewsListSearchParams,
  hasActiveNewsFilters,
  paginateNewsList,
  parseNewsListParams,
  resetNewsListParams,
} from '@/features/news/utils/newsListParams';
import { toast } from '@/shared/ui/Toast';

export default function NewsListPage() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const filters = useMemo(() => parseNewsListParams(searchParams), [searchParams]);
  const categoryOptions = useMemo(() => buildNewsCategoryFilterOptions(), []);
  const showReset = hasActiveNewsFilters(filters);
  const activeFilterChips = useMemo(
    () => buildNewsActiveChips(filters, categoryOptions),
    [filters, categoryOptions],
  );

  const updateFilters = (patch, options = {}) => {
    const next = buildNewsListSearchParams({ ...filters, ...patch }, searchParams);
    setSearchParams(next, { replace: options.replace ?? true });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setLoading(true);
      const result = await fetchPublishedNewsArticles();
      if (cancelled) return;

      if (!result.ok) {
        toast.error(result.message ?? 'Không thể tải tin tức.');
        setArticles([]);
      } else {
        setArticles(result.articles);
      }
      setLoading(false);
    }

    loadNews();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredArticles = useMemo(
    () => filterAndSortNews(articles, { ...filters, status: 'all' }),
    [articles, filters],
  );

  const pagination = useMemo(
    () => paginateNewsList(filteredArticles, filters.page),
    [filteredArticles, filters.page],
  );

  useEffect(() => {
    if (pagination.page !== filters.page) {
      updateFilters({ page: pagination.page });
    }
  }, [pagination.page, filters.page]);

  const handleRemoveFilterChip = (chip) => {
    if (chip.type === 'q') {
      updateFilters({ q: '', page: 1 });
      return;
    }
    if (chip.type === 'category') {
      updateFilters({ category: 'all', page: 1 });
    }
  };

  const handleResetFilters = () => {
    setSearchParams(resetNewsListParams(searchParams), { replace: true });
  };

  const handlePageChange = (page) => {
    updateFilters({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      <Breadcrumbs
        separator="/"
        sx={{ mb: 2.5, '& .MuiBreadcrumbs-separator': { color: '#64748B', mx: 0.5 } }}
      >
        <MuiLink component={Link} to="/home" underline="hover" sx={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
          Trang chủ
        </MuiLink>
        <Typography sx={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>
          Tin tức
        </Typography>
      </Breadcrumbs>

      <NewsCatalogToolbar
        categoryFilter={filters.category}
        onCategoryChange={(category) => updateFilters({ category, page: 1 })}
        sortBy={filters.sort}
        onSortChange={(sort) => updateFilters({ sort, page: 1 })}
        totalCount={loading ? '—' : pagination.total}
        showReset={showReset}
        onReset={handleResetFilters}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveFilterChip}
        categoryOptions={categoryOptions}
      />

      {loading ? (
        <Loading message="Đang tải tin tức..." />
      ) : filteredArticles.length === 0 ? (
        <Box
          sx={{
            py: 7,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          }}
        >
          <ArticleOutlinedIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3, mb: 1.5 }} />
          <EmptyState
            embedded
            title="Không tìm thấy bài viết phù hợp"
            description={filters.q ? 'Thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.' : 'Chưa có tin tức được công bố.'}
            actionLabel={showReset ? 'Xóa bộ lọc' : undefined}
            onAction={showReset ? handleResetFilters : undefined}
          />
        </Box>
      ) : (
        <>
          <Grid container spacing={2.5}>
            {pagination.items.map((article) => (
              <Grid key={article.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <NewsCard article={article} listSearchParams={searchParams} />
              </Grid>
            ))}
          </Grid>

          {pagination.totalPages > 1 ? (
            <NewsListPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          ) : null}
        </>
      )}
    </Box>
  );
}
