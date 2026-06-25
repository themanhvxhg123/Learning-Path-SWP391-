import { getCatalogCategories } from '@/shared/catalog/catalogRegistry';

export const ADMIN_NEWS_TABLE_GRID_COLUMNS =
  'minmax(220px, 1.8fr) minmax(100px, auto) minmax(108px, auto) minmax(108px, auto) minmax(108px, auto) 72px';

export const ADMIN_NEWS_TABLE_HEADERS = [
  'Tiêu đề',
  'Danh mục',
  'Trạng thái',
  'Ngày đăng',
  'Ngày cập nhật',
  'Hành động',
];

export const ADMIN_NEWS_STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã đăng',
  HIDDEN: 'Ẩn',
};

export const ADMIN_NEWS_STATUS_CHIP_SX = {
  DRAFT: {
    bgcolor: 'rgba(100,116,139,0.10)',
    color: '#64748B',
    border: '1px solid rgba(100,116,139,0.22)',
  },
  PUBLISHED: {
    bgcolor: 'rgba(4,120,87,0.12)',
    color: '#047857',
    border: '1px solid rgba(4,120,87,0.24)',
  },
  HIDDEN: {
    bgcolor: 'rgba(220,38,38,0.08)',
    color: '#DC2626',
    border: '1px solid rgba(220,38,38,0.22)',
  },
};

export function buildAdminNewsCategoryFormOptions() {
  return getCatalogCategories().map((category) => ({
    value: String(category.id),
    label: category.displayName,
  }));
}

export function buildAdminNewsCategoryFilterOptions() {
  return [
    { value: 'all', label: 'Tất cả danh mục' },
    ...getCatalogCategories().map((category) => ({
      value: String(category.id),
      label: category.displayName,
    })),
  ];
}

export function formatNewsDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getSortDate(item) {
  return new Date(item.updatedAt || item.publishedAt || 0).getTime();
}

export function filterAndSortNews(news = [], query = {}) {
  const { q = '', category = 'all', status = 'all', sort = 'newest' } = query;
  const keyword = q.trim().toLowerCase();

  let result = news.filter((item) => {
    if (category !== 'all' && String(item.categoryId) !== String(category)) return false;
    if (status !== 'all' && item.status !== status) return false;
    if (!keyword) return true;

    const haystack = [item.title, item.category, item.author, item.excerpt]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  });

  result = [...result].sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return getSortDate(a) - getSortDate(b);
      case 'title_asc':
        return a.title.localeCompare(b.title, 'vi');
      case 'title_desc':
        return b.title.localeCompare(a.title, 'vi');
      case 'newest':
      default:
        return getSortDate(b) - getSortDate(a);
    }
  });

  return result;
}
