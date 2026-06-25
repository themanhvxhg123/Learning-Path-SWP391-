/**
 * Student news service — chỉ trả về bài đã xuất bản (PUBLISHED).
 */
import {
  getNewsArticles,
  getNewsArticleById,
} from '@/features/admin/services/adminNewsService';

function filterPublished(articles = []) {
  return articles.filter((item) => item.status === 'PUBLISHED');
}

export async function fetchPublishedNewsArticles() {
  const result = await getNewsArticles();
  if (!result.ok) {
    return { ok: false, articles: [], message: result.message ?? 'Không tải được tin tức.' };
  }
  return {
    ok: true,
    articles: filterPublished(result.articles),
  };
}

export async function fetchPublishedNewsArticleById(id) {
  const result = await getNewsArticleById(id);
  if (!result.ok) {
    return result;
  }
  if (result.article?.status !== 'PUBLISHED') {
    return { ok: false, message: 'Không tìm thấy tin tức hoặc bài viết chưa được công bố.' };
  }
  return result;
}

export async function fetchFeaturedNewsArticles(limit = 3) {
  const result = await fetchPublishedNewsArticles();
  if (!result.ok) {
    return { ok: false, articles: [] };
  }
  const sorted = [...result.articles].sort(
    (a, b) =>
      new Date(b.publishedAt || b.updatedAt || 0).getTime()
      - new Date(a.publishedAt || a.updatedAt || 0).getTime(),
  );
  return { ok: true, articles: sorted.slice(0, limit) };
}
