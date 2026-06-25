const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const AVATAR_UPDATED_EVENT = 'avatar-updated';

export function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl) || avatarUrl.startsWith('data:')) return avatarUrl;
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${API_ORIGIN}${path}`;
}

export function persistUserAvatar(avatarUrl) {
  const resolved = resolveAvatarUrl(avatarUrl);
  if (!resolved) return null;

  localStorage.setItem('avatarUrl', resolved);

  try {
    const raw = localStorage.getItem('user');
    if (raw && raw !== 'undefined' && raw !== 'null') {
      const user = JSON.parse(raw);
      localStorage.setItem('user', JSON.stringify({ ...user, avatarUrl: resolved }));
    }
  } catch {
    // ignore corrupt user payload
  }

  window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { avatarUrl: resolved } }));
  return resolved;
}

export function getStoredAvatarUrl() {
  const explicit = localStorage.getItem('avatarUrl');
  if (explicit) return explicit;

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.avatarUrl ? resolveAvatarUrl(user.avatarUrl) : null;
  } catch {
    return null;
  }
}
