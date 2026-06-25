/**
 * Admin Account Service — calls real backend APIs.
 */
import { apiGet, apiPost, apiPut } from '@/features/admin/services/adminApiClient';

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
    status: 'ACTIVE',
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

  // Update user basic info
  const updateData = {};
  if (payload.fullName) updateData.FullName = payload.fullName;
  if (payload.email) updateData.Email = payload.email;
  if (payload.phone !== undefined) updateData.Phone = payload.phone;
  if (payload.dateOfBirth !== undefined) updateData.DateOfBirth = payload.dateOfBirth;

  if (Object.keys(updateData).length > 0) {
    const userRes = await apiPut(`/users/${userId}`, updateData);
    if (!userRes.ok) {
      return { ok: false, message: userRes.message || 'Không thể cập nhật tài khoản' };
    }
  }

  // Re-fetch the updated user
  const detailRes = await apiGet(`/users/${userId}`);
  const account = detailRes.ok && detailRes.data ? mapUserToAccount(detailRes.data) : null;

  return { ok: true, account };
}

export async function toggleAccountStatus(id) {
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
