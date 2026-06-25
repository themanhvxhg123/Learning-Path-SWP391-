import { getUser } from '@/features/auth/utils/authUtils';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';

function getAuthHeaders(extra = {}) {
  const user = getUser();
  const headers = { ...extra };
  if (user?.userId) {
    headers['x-user-id'] = String(user.userId);
  }
  return headers;
}

export async function fetchUserProfile() {
  const response = await fetch(`${API_BASE}/users/profile`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function uploadUserAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file, 'avatar.png');

  const response = await fetch(`${API_BASE}/users/avatar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  return response.json();
}
