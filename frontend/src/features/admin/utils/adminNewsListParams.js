import {
  ADMIN_NEWS_SORT_OPTIONS,
  ADMIN_NEWS_STATUS_OPTIONS,
} from '@/features/admin/data/adminNewsMock';

export const ADMIN_NEWS_LIST_PAGE_SIZE = 10;

export const ADMIN_NEWS_LIST_DEFAULTS = {
  q: '',
  category: 'all',
  status: 'all',
  sort: 'newest',
  page: 1,
};

export function parseAdminNewsListParams(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  return {
    q: searchParams.get('q') ?? ADMIN_NEWS_LIST_DEFAULTS.q,
    category: searchParams.get('category') ?? ADMIN_NEWS_LIST_DEFAULTS.category,
    status: searchParams.get('status') ?? ADMIN_NEWS_LIST_DEFAULTS.status,
    sort: searchParams.get('sort') ?? ADMIN_NEWS_LIST_DEFAULTS.sort,
    page: Number.isFinite(page) ? page : 1,
  };
}

export function buildAdminNewsListSearchParams(nextState, currentSearchParams) {
  const params = new URLSearchParams(currentSearchParams);

  const setOrDelete = (key, value, defaultValue) => {
    if (value == null || value === '' || value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  };

  setOrDelete('q', nextState.q, ADMIN_NEWS_LIST_DEFAULTS.q);
  setOrDelete('category', nextState.category, ADMIN_NEWS_LIST_DEFAULTS.category);
  setOrDelete('status', nextState.status, ADMIN_NEWS_LIST_DEFAULTS.status);
  setOrDelete('sort', nextState.sort, ADMIN_NEWS_LIST_DEFAULTS.sort);
  setOrDelete('page', nextState.page, ADMIN_NEWS_LIST_DEFAULTS.page);

  return params;
}

export function resetAdminNewsListParams(currentSearchParams) {
  const params = new URLSearchParams(currentSearchParams);
  ['q', 'category', 'status', 'sort', 'page'].forEach((key) => params.delete(key));
  return params;
}

export function hasActiveAdminNewsFilters(query = {}) {
  return (
    Boolean(query.q?.trim()) ||
    query.category !== ADMIN_NEWS_LIST_DEFAULTS.category ||
    query.status !== ADMIN_NEWS_LIST_DEFAULTS.status ||
    query.sort !== ADMIN_NEWS_LIST_DEFAULTS.sort
  );
}

export function buildAdminNewsActiveChips(filters, options = {}) {
  const {
    categoryOptions = [],
    statusOptions = ADMIN_NEWS_STATUS_OPTIONS,
  } = options;
  const chips = [];

  if (filters.q) {
    chips.push({ key: `q:${filters.q}`, type: 'q', value: filters.q, label: `"${filters.q}"` });
  }
  if (filters.category && filters.category !== ADMIN_NEWS_LIST_DEFAULTS.category) {
    chips.push({
      key: `category:${filters.category}`,
      type: 'category',
      value: filters.category,
      label: categoryOptions.find((o) => String(o.value) === String(filters.category))?.label
        ?? filters.category,
    });
  }
  if (filters.status && filters.status !== ADMIN_NEWS_LIST_DEFAULTS.status) {
    chips.push({
      key: `status:${filters.status}`,
      type: 'status',
      value: filters.status,
      label: statusOptions.find((o) => o.value === filters.status)?.label ?? filters.status,
    });
  }
  return chips;
}

export function paginateNews(news = [], page = 1, pageSize = ADMIN_NEWS_LIST_PAGE_SIZE) {
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

export { ADMIN_NEWS_SORT_OPTIONS };
