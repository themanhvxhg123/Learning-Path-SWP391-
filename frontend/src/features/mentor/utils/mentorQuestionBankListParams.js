export const QB_LIST_DEFAULTS = {
  q: '',
  status: 'all',
  questionStatus: 'all',
  sort: 'updated_desc',
  page: 1,
  pageSize: 8,
};

const QB_PARAM_KEYS = ['q', 'status', 'questionStatus', 'sort', 'page', 'pageSize'];
const VALID_STATUS = new Set(['all', 'published', 'draft']);
const VALID_QUESTION_STATUS = new Set(['all', 'has_draft', 'all_published', 'empty']);
const VALID_SORT = new Set(['updated_desc', 'name_asc', 'questions_desc']);

function parsePage(value) {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function parseQBListParams(searchParams) {
  const status = searchParams.get('status') ?? QB_LIST_DEFAULTS.status;
  const questionStatus = searchParams.get('questionStatus') ?? QB_LIST_DEFAULTS.questionStatus;
  const sort = searchParams.get('sort') ?? QB_LIST_DEFAULTS.sort;
  return {
    q: (searchParams.get('q') ?? '').trim(),
    status: VALID_STATUS.has(status) ? status : QB_LIST_DEFAULTS.status,
    questionStatus: VALID_QUESTION_STATUS.has(questionStatus)
      ? questionStatus
      : QB_LIST_DEFAULTS.questionStatus,
    sort: VALID_SORT.has(sort) ? sort : QB_LIST_DEFAULTS.sort,
    page: parsePage(searchParams.get('page')),
    pageSize: QB_LIST_DEFAULTS.pageSize,
  };
}

export function hasActiveQBFilters(filters) {
  return (
    Boolean(filters.q) ||
    filters.status !== QB_LIST_DEFAULTS.status ||
    filters.questionStatus !== QB_LIST_DEFAULTS.questionStatus ||
    filters.sort !== QB_LIST_DEFAULTS.sort ||
    filters.page !== QB_LIST_DEFAULTS.page
  );
}

export function buildQBListSearchParams(filters, currentSearchParams) {
  const params = new URLSearchParams(currentSearchParams);
  QB_PARAM_KEYS.forEach((key) => params.delete(key));

  if (filters.q) params.set('q', filters.q.trim());
  if (filters.status !== QB_LIST_DEFAULTS.status) params.set('status', filters.status);
  if (filters.questionStatus !== QB_LIST_DEFAULTS.questionStatus) {
    params.set('questionStatus', filters.questionStatus);
  }
  if (filters.sort !== QB_LIST_DEFAULTS.sort) params.set('sort', filters.sort);
  if (filters.page !== QB_LIST_DEFAULTS.page) params.set('page', String(filters.page));
  return params;
}

export function resetQBListParams(currentSearchParams) {
  const params = new URLSearchParams(currentSearchParams);
  QB_PARAM_KEYS.forEach((key) => params.delete(key));
  return params;
}

export function buildQBActiveChips(filters, options = {}) {
  const { statusOptions = [], questionStatusOptions = [] } = options;
  const chips = [];

  if (filters.q) {
    chips.push({ key: `q:${filters.q}`, type: 'q', value: filters.q, label: `"${filters.q}"` });
  }
  if (filters.status && filters.status !== QB_LIST_DEFAULTS.status) {
    chips.push({
      key: `status:${filters.status}`,
      type: 'status',
      value: filters.status,
      label: statusOptions.find((o) => o.value === filters.status)?.label ?? filters.status,
    });
  }
  if (filters.questionStatus && filters.questionStatus !== QB_LIST_DEFAULTS.questionStatus) {
    chips.push({
      key: `questionStatus:${filters.questionStatus}`,
      type: 'questionStatus',
      value: filters.questionStatus,
      label:
        questionStatusOptions.find((o) => o.value === filters.questionStatus)?.label ??
        filters.questionStatus,
    });
  }
  return chips;
}

function matchesQuestionStatus(item, questionStatus) {
  if (questionStatus === 'all') return true;
  const total = item.TotalQuestionCount ?? 0;
  const draft = item.DraftQuestionCount ?? 0;
  if (questionStatus === 'empty') return total === 0;
  if (questionStatus === 'has_draft') return draft > 0;
  if (questionStatus === 'all_published') return total > 0 && draft === 0;
  return true;
}

export function filterAndSortQBItems(items, query = {}) {
  const { q = '', status = 'all', questionStatus = 'all', sort = 'updated_desc' } = query;
  const keyword = q.trim().toLowerCase();

  let result = items.filter((item) => {
    if (status !== 'all' && item.Status !== status) return false;
    if (!matchesQuestionStatus(item, questionStatus)) return false;
    if (keyword) {
      const haystack = [item.CourseName, item.Description].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  result = [...result].sort((a, b) => {
    if (sort === 'name_asc') return (a.CourseName ?? '').localeCompare(b.CourseName ?? '', 'vi');
    if (sort === 'questions_desc') {
      return (b.TotalQuestionCount ?? 0) - (a.TotalQuestionCount ?? 0);
    }
    return (
      new Date(b.QuestionBankUpdatedAt ?? 0).getTime() -
      new Date(a.QuestionBankUpdatedAt ?? 0).getTime()
    );
  });

  return result;
}

export function paginateQBItems(items, page, pageSize) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalItems,
    totalPages,
    page: safePage,
    rangeStart: totalItems === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, totalItems),
  };
}
