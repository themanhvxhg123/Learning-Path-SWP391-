/**
 * API client for Admin endpoints.
 * Uses fetch with auth headers from localStorage.
 *
 * 📍 VỊ TRÍ TRONG LUỒNG CHỈNH SỬA (BƯỚC 7 - GỬI HTTP REQUEST):
 * File này chứa các hàm apiGet/apiPost/apiPut/apiDelete dùng fetch để gửi
 * request HTTP tới backend. Hàm apiPut() được gọi từ adminAccountService
 * khi cập nhật vai trò/trạng thái tài khoản.
 * ➡️ Đến từ: adminAccountService.js (dòng 64) — frontend/src/features/admin/services/adminAccountService.js
 * ➡️ Đi tiếp (backend): adminRoutes.js (dòng 36) — backend/routes/adminRoutes.js
 */
const API_BASE = 'http://localhost:5000/api/admin';


function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.userId) {
        headers['x-user-id'] = String(user.userId);
      }
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
    }
  } catch {
    // ignore
  }
  return headers;
}

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    return { ok: false, message: data.message || 'Lỗi server', data: null };
  }
  return { ok: true, data: data.data, message: data.message };
}

export async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (err) {
    return { ok: false, message: 'Không thể kết nối đến server', data: null };
  }
}

export async function apiPost(endpoint, body) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  } catch (err) {
    return { ok: false, message: 'Không thể kết nối đến server', data: null };
  }
}

export async function apiPut(endpoint, body) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  } catch (err) {
    return { ok: false, message: 'Không thể kết nối đến server', data: null };
  }
}

export async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (err) {
    return { ok: false, message: 'Không thể kết nối đến server', data: null };
  }
}
