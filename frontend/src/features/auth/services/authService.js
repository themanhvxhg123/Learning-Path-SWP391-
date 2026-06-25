const API_BASE = 'http://localhost:5000/api';

// ==========================================
// CÁC HÀM HELPER GỌI API CHO GỌN CODE
// ==========================================

// Dùng cho API Auth (Login, Register...)
const apiAuthFetch = async (endpoint, body) => {
  const response = await fetch(`${API_BASE}/auth${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { ok: data.success, status: data.status, data: data.user || data };
};

// Dùng cho API lấy dữ liệu thông thường (GET)
const apiGet = async (endpoint) => {
  const response = await fetch(`${API_BASE}${endpoint}`);
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
};

// Dùng cho API Gửi dữ liệu thông thường (POST)
const apiPost = async (endpoint, body) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { ok: response.ok, data };
};

// ==========================================
// 1. API KHÓA HỌC (COURSES)
// ==========================================

export const getCoursesApi = (userId) => {
  const headers = userId ? { 'x-user-id': String(userId) } : {};
  return fetch(`${API_BASE}/courses`, { headers })
    .then((res) => res.json())
    .then((data) => ({ ok: true, data }))
    .catch(() => ({ ok: false, data: {} }));
};

export const getTopCoursesApi = (limit = 4) => apiGet(`/courses/top?limit=${limit}`);

// 🔥 ĐÃ FIX: Nhận thẳng 1 cục Object (data) từ Frontend truyền sang
export const enrollCourseApi = (data) => apiPost('/courses/enroll', data);

export const getMyCoursesApi = (userId) => apiGet(`/courses/my?userId=${userId}`);


// ==========================================
// 2. API XÁC THỰC (AUTH & USER)
// ==========================================

export const loginApi = (email, password) => apiAuthFetch('/login', { email, password });

export const registerApi = (formData) => apiAuthFetch('/register', formData);

export const verifyOtpApi = (email, otpCode) => apiAuthFetch('/verify-otp', { email, otpCode });

export const getCategoriesApi = () => apiGet('/categories');

export const getLevelsApi = () => apiGet('/levels');

export const saveOnboardingApi = (userId, categoryIds, levelId, goal) =>
  apiAuthFetch('/onboarding', { userId, categoryIds, levelId, goal });

export const forgotPasswordApi = (email) => apiAuthFetch('/forgot-password', { email });

export const resetPasswordApi = (email, otp, newPassword) => apiAuthFetch('/reset-password', { email, otp, newPassword });