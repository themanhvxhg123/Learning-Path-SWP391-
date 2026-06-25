/**
 * Admin Category Service — calls real backend APIs.
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/features/admin/services/adminApiClient';
import { resolveSeedColorCode } from '@/shared/catalog/catalogColorPalette';

/**
 * Map a backend category record to the frontend shape.
 * Backend returns: CategoryId, CategoryName, DisplayName, CreatedAt
 */
function mapCategory(raw) {
  return {
    id: raw.CategoryId,
    categoryName: raw.CategoryName || '',
    displayName: raw.DisplayName || '',
    colorCode: raw.ColorCode || resolveSeedColorCode('category', raw.CategoryId) || null,
    status: raw.Status || 'ACTIVE',
    createdAt: raw.CreatedAt || null,
  };
}

export async function getCategories() {
  const res = await apiGet('/categories');
  if (!res.ok) return { ok: false, categories: [] };
  const categories = (res.data || []).map(mapCategory);
  return { ok: true, categories };
}

export async function createCategory(payload) {
  const res = await apiPost('/categories', {
    CategoryName: payload.categoryName || payload.displayName?.toLowerCase().replace(/\s+/g, '-') || '',
    DisplayName: payload.displayName,
  });
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể tạo danh mục' };
  }
  return { ok: true, category: mapCategory(res.data) };
}

export async function updateCategory(id, payload) {
  const res = await apiPut(`/categories/${id}`, {
    CategoryName: payload.categoryName || payload.displayName?.toLowerCase().replace(/\s+/g, '-') || '',
    DisplayName: payload.displayName,
  });
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể cập nhật danh mục' };
  }
  // Re-fetch to get updated data
  const fetchRes = await getCategories();
  const updated = (fetchRes.categories || []).find((c) => String(c.id) === String(id));
  return { ok: true, category: updated || null };
}

export async function deleteCategory(id) {
  const res = await apiDelete(`/categories/${id}`);
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể xoá danh mục' };
  }
  return { ok: true, message: 'Đã xoá danh mục thành công' };
}
