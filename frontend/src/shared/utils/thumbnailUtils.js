const INVALID_THUMBNAIL_MARKERS = new Set([
  '',
  'CHƯA FIX LỖI ẢNH',
  'null',
  'undefined',
]);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function sanitizeThumbnail(thumbnail) {
  let value = String(thumbnail ?? '').trim();
  value = value.replace(/\\/g, '/');
  if (!value || INVALID_THUMBNAIL_MARKERS.has(value)) return '';
  return value;
}

export function resolveThumbnailUrl(thumbnail, cacheKey) {
  const value = sanitizeThumbnail(thumbnail);
  if (!value) return '';

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:image') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  let url = `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
  if (cacheKey != null && cacheKey !== '') {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}v=${encodeURIComponent(String(cacheKey))}`;
  }
  return url;
}
