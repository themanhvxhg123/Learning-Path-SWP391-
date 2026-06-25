import { ADMIN_NEWS_SORT_OPTIONS } from '@/features/admin/data/adminNewsMock';
import { buildAdminNewsCategoryFilterOptions } from '@/features/admin/utils/adminNewsUtils';

export const NEWS_LIST_PAGE_SIZE = 9;

export const NEWS_LIST_DEFAULTS = {
  q: '',
  category: 'all',
  sort: 'newest',
  page: 1,
};

export const NEWS_SORT_OPTIONS = ADMIN_NEWS_SORT_OPTIONS.filter(
  (option) => option.value !== 'title_desc',
);

export function buildNewsCategoryFilterOptions() {
  return buildAdminNewsCategoryFilterOptions();
}

export function parseNewsListParams(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  return {
    q: searchParams.get('q') ?? NEWS_LIST_DEFAULTS.q,
    category: searchParams.get('category') ?? NEWS_LIST_DEFAULTS.category,
    sort: searchParams.get('sort') ?? NEWS_LIST_DEFAULTS.sort,
    page: Number.isFinite(page) ? page : 1,
  };
}

export function buildNewsListSearchParams(nextState, currentSearchParams) {
  const params = new URLSearchParams(currentSearchParams);

  const setOrDelete = (key, value, defaultValue) => {
    if (value == null || value === '' || value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  };

  setOrDelete('q', nextState.q, NEWS_LIST_DEFAULTS.q);
  setOrDelete('category', nextState.category, NEWS_LIST_DEFAULTS.category);
  setOrDelete('sort', nextState.sort, NEWS_LIST_DEFAULTS.sort);
  setOrDelete('page', nextState.page, NEWS_LIST_DEFAULTS.page);

  return params;
}

export function resetNewsListParams(currentSearchParams) {
  const params = new URLSearchParams(currentSearchParams);
  ['q', 'category', 'sort', 'page'].forEach((key) => params.delete(key));
  return params;
}

export function hasActiveNewsFilters(query = {}) {
  return (
    Boolean(query.q?.trim()) ||
    query.category !== NEWS_LIST_DEFAULTS.category ||
    query.sort !== NEWS_LIST_DEFAULTS.sort
  );
}

export function buildNewsActiveChips(filters, categoryOptions = []) {
  const chips = [];

  if (filters.q) {
    chips.push({ key: `q:${filters.q}`, type: 'q', value: filters.q, label: `"${filters.q}"` });
  }
  if (filters.category && filters.category !== NEWS_LIST_DEFAULTS.category) {
    chips.push({
      key: `category:${filters.category}`,
      type: 'category',
      value: filters.category,
      label: categoryOptions.find((o) => String(o.value) === String(filters.category))?.label
        ?? filters.category,
    });
  }
  return chips;
}

export function paginateNewsList(news = [], page = 1, pageSize = NEWS_LIST_PAGE_SIZE) {
  const total = news.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: news.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}

export function buildNewsDetailPath(newsId, listSearchParams) {
  const query = listSearchParams?.toString();
  return query ? `/news/${newsId}?from=${encodeURIComponent(query)}` : `/news/${newsId}`;
}

export function buildNewsListPath(fromQuery) {
  if (!fromQuery) return '/news';
  return `/news?${fromQuery}`;
}
