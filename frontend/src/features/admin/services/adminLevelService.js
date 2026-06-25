/**
 * Admin Level Service — calls real backend APIs.
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/features/admin/services/adminApiClient';
import { resolveSeedColorCode } from '@/shared/catalog/catalogColorPalette';

/**
 * Map a backend level record to the frontend shape.
 * Backend returns: LevelId, LevelName, DisplayName, SortOrder, CreatedAt
 */
function mapLevel(raw) {
  return {
    id: raw.LevelId,
    levelName: raw.LevelName || '',
    displayName: raw.DisplayName || '',
    sortOrder: Number(raw.SortOrder) || 0,
    colorCode: raw.ColorCode || resolveSeedColorCode('level', raw.LevelId) || null,
    status: raw.Status || 'ACTIVE',
    createdAt: raw.CreatedAt || null,
  };
}

export async function getLevels() {
  const res = await apiGet('/levels');
  if (!res.ok) return { ok: false, levels: [] };
  const levels = (res.data || []).map(mapLevel);
  return { ok: true, levels };
}

export async function createLevel(payload) {
  const res = await apiPost('/levels', {
    LevelName: payload.levelName || payload.displayName?.toLowerCase().replace(/\s+/g, '-') || '',
    DisplayName: payload.displayName,
    SortOrder: payload.sortOrder || 1,
  });
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể tạo trình độ' };
  }
  return { ok: true, level: mapLevel(res.data) };
}

export async function updateLevel(id, payload) {
  const res = await apiPut(`/levels/${id}`, {
    LevelName: payload.levelName || payload.displayName?.toLowerCase().replace(/\s+/g, '-') || '',
    DisplayName: payload.displayName,
    SortOrder: payload.sortOrder || 1,
  });
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể cập nhật trình độ' };
  }
  // Re-fetch to get updated data
  const fetchRes = await getLevels();
  const updated = (fetchRes.levels || []).find((l) => String(l.id) === String(id));
  return { ok: true, level: updated || null };
}

export async function deleteLevel(id) {
  const res = await apiDelete(`/levels/${id}`);
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể xoá trình độ' };
  }
  return { ok: true, message: 'Đã xoá trình độ thành công' };
}
