/**
 * Admin News Service — mock API-ready; swap to real backend when News table exists.
 */
import { MOCK_ADMIN_NEWS } from '@/features/admin/data/adminNewsMock';
import { getCatalogCategories } from '@/shared/catalog/catalogRegistry';

const MOCK_DELAY_MS = 280;

function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeNews(raw = {}) {
  return {
    id: raw.id,
    title: raw.title ?? '',
    category: raw.category ?? '',
    categoryId: raw.categoryId ?? null,
    status: raw.status ?? 'DRAFT',
    author: raw.author ?? '',
    excerpt: raw.excerpt ?? '',
    content: raw.content ?? '',
    thumbnail: raw.thumbnail ?? null,
    publishedAt: raw.publishedAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

function resolveCategoryLabel(categoryId) {
  const category = getCatalogCategories().find(
    (item) => String(item.id) === String(categoryId),
  );
  return category?.displayName ?? '';
}

function findNewsIndex(id) {
  return MOCK_ADMIN_NEWS.findIndex((item) => String(item.id) === String(id));
}

function getNextNewsId() {
  const ids = MOCK_ADMIN_NEWS.map((item) => Number(item.id) || 0);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function buildNewsPayload(payload = {}, existing = {}) {
  const title = String(payload.title ?? '').trim();
  const categoryId = payload.categoryId;
  const status = payload.status ?? existing.status ?? 'DRAFT';
  const now = new Date().toISOString();
  const wasPublished = existing.status === 'PUBLISHED';
  const isPublished = status === 'PUBLISHED';

  let publishedAt = existing.publishedAt ?? null;
  if (isPublished && !publishedAt) {
    publishedAt = now;
  } else if (!isPublished && !wasPublished) {
    publishedAt = null;
  }

  return {
    title,
    category: resolveCategoryLabel(categoryId),
    categoryId: Number(categoryId),
    status,
    author: String(payload.author ?? '').trim() || existing.author || 'Admin',
    excerpt: String(payload.excerpt ?? '').trim(),
    content: String(payload.content ?? '').trim(),
    thumbnail: String(payload.thumbnail ?? '').trim() || null,
    publishedAt,
    updatedAt: now,
  };
}

export async function getNewsArticles() {
  await delay();
  return {
    ok: true,
    articles: MOCK_ADMIN_NEWS.map(normalizeNews),
  };
}

export async function getNewsArticleById(id) {
  await delay();
  const index = findNewsIndex(id);
  if (index < 0) {
    return { ok: false, message: 'Không tìm thấy tin tức' };
  }
  return {
    ok: true,
    article: normalizeNews(MOCK_ADMIN_NEWS[index]),
  };
}

export async function createNewsArticle(payload = {}) {
  await delay();

  const title = String(payload.title ?? '').trim();
  const categoryId = payload.categoryId;
  const status = payload.status ?? 'DRAFT';

  if (!title) {
    return { ok: false, message: 'Tiêu đề không được để trống' };
  }
  if (!categoryId) {
    return { ok: false, message: 'Vui lòng chọn danh mục' };
  }

  const now = new Date().toISOString();
  const article = {
    id: getNextNewsId(),
    ...buildNewsPayload(payload, {}),
    publishedAt: status === 'PUBLISHED' ? now : null,
    updatedAt: now,
  };

  MOCK_ADMIN_NEWS.unshift(article);

  return {
    ok: true,
    article: normalizeNews(article),
  };
}

export async function updateNewsArticle(id, payload = {}) {
  await delay();

  const index = findNewsIndex(id);
  if (index < 0) {
    return { ok: false, message: 'Không tìm thấy tin tức' };
  }

  const existing = MOCK_ADMIN_NEWS[index];
  const title = String(payload.title ?? existing.title ?? '').trim();
  const categoryId = payload.categoryId ?? existing.categoryId;

  if (!title) {
    return { ok: false, message: 'Tiêu đề không được để trống' };
  }
  if (!categoryId) {
    return { ok: false, message: 'Vui lòng chọn danh mục' };
  }

  const next = {
    ...existing,
    ...buildNewsPayload(payload, existing),
    id: existing.id,
  };

  MOCK_ADMIN_NEWS[index] = next;

  return {
    ok: true,
    article: normalizeNews(next),
  };
}

export async function updateNewsArticleBasicInfo(id, payload = {}) {
  await delay();

  const index = findNewsIndex(id);
  if (index < 0) {
    return { ok: false, message: 'Không tìm thấy tin tức' };
  }

  const existing = MOCK_ADMIN_NEWS[index];
  const title = String(payload.title ?? '').trim();
  const categoryId = payload.categoryId;

  if (!title) {
    return { ok: false, message: 'Tiêu đề không được để trống' };
  }
  if (!categoryId) {
    return { ok: false, message: 'Vui lòng chọn danh mục' };
  }

  const next = {
    ...existing,
    ...buildNewsPayload({ ...payload, content: existing.content ?? '' }, existing),
    id: existing.id,
  };

  MOCK_ADMIN_NEWS[index] = next;

  return {
    ok: true,
    article: normalizeNews(next),
  };
}

export async function updateNewsArticleContent(id, content = '') {
  await delay();

  const index = findNewsIndex(id);
  if (index < 0) {
    return { ok: false, message: 'Không tìm thấy tin tức' };
  }

  const existing = MOCK_ADMIN_NEWS[index];
  const next = {
    ...existing,
    content: String(content ?? '').trim(),
    updatedAt: new Date().toISOString(),
  };

  MOCK_ADMIN_NEWS[index] = next;

  return {
    ok: true,
    article: normalizeNews(next),
  };
}

export async function revertNewsArticle(id, original = {}) {
  await delay();

  const index = findNewsIndex(id);
  if (index < 0) {
    return { ok: false, message: 'Không tìm thấy tin tức' };
  }

  const existing = MOCK_ADMIN_NEWS[index];
  const title = String(original.title ?? existing.title ?? '').trim();
  const categoryId = original.categoryId ?? existing.categoryId;

  if (!title || !categoryId) {
    return { ok: false, message: 'Không thể khôi phục bài viết' };
  }

  const next = {
    ...existing,
    ...buildNewsPayload(original, existing),
    id: existing.id,
  };

  MOCK_ADMIN_NEWS[index] = next;

  return {
    ok: true,
    article: normalizeNews(next),
  };
}
