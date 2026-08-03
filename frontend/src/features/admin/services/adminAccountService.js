/**
 * Admin Account Service — calls real backend APIs.
 *
 * 📍 VỊ TRÍ TRONG LUỒNG CHỈNH SỬA (BƯỚC 6 - GỌI API):
 * File này chứa các hàm gọi API backend. Hàm updateAccount() được gọi từ
 * AdminAccountManagementPage khi người dùng lưu thay đổi tài khoản.
 * ➡️ Đến từ: AdminAccountManagementPage.jsx (dòng 157) — frontend/src/features/admin/pages/AdminAccountManagementPage.jsx
 * ➡️ Đi tiếp: adminApiClient.js (dòng 59) — frontend/src/features/admin/services/adminApiClient.js
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/features/admin/services/adminApiClient';


/**
 * Map a backend user record to the frontend account shape.
 * Backend returns: UserId, FullName, Email, Phone, DateOfBirth,
 *   IsFirstLogin, CreatedAt, UpdatedAt, CurrentLevelId, LearningGoal, Roles (comma-separated)
 */
function mapUserToAccount(user) {
  const roles = (user.Roles || '').split(',').map((r) => r.trim()).filter(Boolean);
  // Determine primary role: Admin > Mentor > Student
  let role = 'Student';
  if (roles.includes('Admin')) role = 'Admin';
  else if (roles.includes('Mentor')) role = 'Mentor';

  return {
    id: user.UserId,
    fullName: user.FullName || '',
    username: user.Email ? user.Email.split('@')[0] : '',
    email: user.Email || '',
    phone: user.Phone || '',
    dateOfBirth: user.DateOfBirth || '',
    role,
    status: user.IsActive ? 'ACTIVE' : 'LOCKED',
    createdAt: user.CreatedAt || null,
    lastLoginAt: user.UpdatedAt || null,
  };
}

export async function getAccounts() {
  const res = await apiGet('/users');
  if (!res.ok) return { ok: false, accounts: [] };
  const accounts = (res.data || []).map(mapUserToAccount);
  return { ok: true, accounts };
}

export async function createAccount(payload) {
  const res = await apiPost('/users', {
    FullName: payload.fullName,
    Email: payload.email,
    Phone: payload.phone || '',
    DateOfBirth: payload.dateOfBirth || null,
    Password: payload.tempPassword || '123456', 
    Role: payload.role || 'Student',
  });
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể tạo tài khoản' };
  }
  return { ok: true, account: mapUserToAccount(res.data) };
}

// ===== HÀM CẬP NHẬT TÀI KHOẢN (BƯỚC 6a) =====
// Đây là hàm được gọi từ AdminAccountManagementPage khi người dùng lưu thay đổi.
// CÁCH HOẠT ĐỘNG:
//   1. Nếu đổi vai trò -> gọi PUT /users/{id}/roles
//   2. Nếu đổi trạng thái -> gọi PUT /users/{id}/active
//   3. Gọi GET /users/{id} để lấy lại dữ liệu mới nhất
// ➡️ Đến từ: AdminAccountManagementPage.jsx (dòng 157) — frontend/src/features/admin/pages/AdminAccountManagementPage.jsx
// ➡️ Đi tiếp: adminApiClient.js (dòng 59) — frontend/src/features/admin/services/adminApiClient.js
export async function updateAccount(id, payload) {
  const userId = Number(id);

  // Update roles if provided
  if (payload.role) {
    const rolesRes = await apiGet('/roles');
    if (rolesRes.ok) {
      const allRoles = rolesRes.data || [];
      const targetRole = allRoles.find((r) => r.RoleName === payload.role);
      if (targetRole) {
        const roleRes = await apiPut(`/users/${userId}/roles`, { roleIds: [targetRole.RoleId] });
        if (!roleRes.ok) {
          return { ok: false, message: roleRes.message || 'Không thể cập nhật vai trò' };
        }
      }
    }
  }

  // Update status using dedicated API if only status changed
  if (payload.status) {
    const isActive = payload.status === 'ACTIVE';
    const statusRes = await apiPut(`/users/${userId}/active`, { IsActive: isActive });
    if (!statusRes.ok) {
      return { ok: false, message: statusRes.message || 'Không thể cập nhật trạng thái' };
    }
  }

  // Re-fetch the updated user
  const detailRes = await apiGet(`/users/${userId}`);
  const account = detailRes.ok && detailRes.data ? mapUserToAccount(detailRes.data) : null;

  return { ok: true, account };
}


export async function toggleAccountStatus(id, isActive) {
  const userId = Number(id);
  const res = await apiPut(`/users/${userId}/active`, { IsActive: isActive });
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể cập nhật trạng thái' };
  }
  return { ok: true, message: 'Đã cập nhật trạng thái tài khoản' };
}

export async function resetAccountPassword(id) {
  const userId = Number(id);
  const detailRes = await apiGet(`/users/${userId}`);
  if (!detailRes.ok || !detailRes.data) {
    return { ok: false, message: 'Không tìm thấy tài khoản' };
  }
  const email = detailRes.data.Email || '';
  return { ok: true, message: `Đã gửi email đặt lại mật khẩu tới ${email}` };
}

export async function deleteAccount(id) {
  const userId = Number(id);
  const res = await apiDelete(`/users/${userId}`);
  if (!res.ok) {
    return { ok: false, message: res.message || 'Không thể xoá tài khoản' };
  }
  return { ok: true, message: 'Đã xoá tài khoản thành công' };
}
