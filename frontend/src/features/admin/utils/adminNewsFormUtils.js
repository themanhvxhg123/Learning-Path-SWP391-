import { isHtmlContentEmpty } from '@/features/mentor/utils/mentorCourseContentUtils';

export const ADMIN_NEWS_FORM_INITIAL = {
  title: '',
  categoryId: '',
  status: 'DRAFT',
  author: '',
  excerpt: '',
  thumbnail: '',
};

export const ADMIN_NEWS_CONTENT_MATERIAL_TEMP_ID = 'admin-news-content';

export function createAdminNewsContentMaterial(content = '') {
  return {
    tempId: ADMIN_NEWS_CONTENT_MATERIAL_TEMP_ID,
    Content: content,
  };
}

export function mapArticleToEditOriginal(article = {}) {
  return {
    title: article.title ?? '',
    categoryId: article.categoryId != null ? Number(article.categoryId) : null,
    status: article.status ?? 'DRAFT',
    author: article.author ?? '',
    excerpt: article.excerpt ?? '',
    thumbnail: article.thumbnail ?? '',
    content: article.content ?? '',
  };
}

export function mapArticleToNewsFormStep1(article = {}) {
  return {
    title: article.title ?? '',
    categoryId: article.categoryId != null ? String(article.categoryId) : '',
    status: article.status ?? 'DRAFT',
    author: article.author ?? '',
    excerpt: article.excerpt ?? '',
    thumbnail: article.thumbnail ?? '',
  };
}

export function validateAdminNewsFormStep1(values = {}) {
  const errors = {};
  const title = String(values.title ?? '').trim();
  const categoryId = String(values.categoryId ?? '').trim();
  const status = values.status;
  const author = String(values.author ?? '').trim();

  if (!title) {
    errors.title = 'Vui lòng nhập tiêu đề';
  } else if (title.length < 5) {
    errors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
  }

  if (!categoryId) {
    errors.categoryId = 'Vui lòng chọn danh mục';
  }

  if (!status) {
    errors.status = 'Vui lòng chọn trạng thái';
  }

  if (!author) {
    errors.author = 'Vui lòng nhập tác giả';
  }

  return errors;
}

export function validateAdminNewsContent(content = '') {
  const errors = {};
  if (isHtmlContentEmpty(content)) {
    errors.Content = 'Vui lòng nhập nội dung bài viết';
  }
  return errors;
}

/** Alias giữ tương thích cũ. */
export function validateAdminNewsForm(values = {}) {
  return validateAdminNewsFormStep1(values);
}

export function hasAdminNewsFormErrors(errors = {}) {
  return Object.keys(errors).length > 0;
}

export function isAdminNewsFormDirty(values = {}, initial = ADMIN_NEWS_FORM_INITIAL) {
  return Object.keys(initial).some((key) => String(values[key] ?? '') !== String(initial[key] ?? ''));
}
