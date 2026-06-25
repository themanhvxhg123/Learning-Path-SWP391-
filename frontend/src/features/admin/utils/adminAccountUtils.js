export const ADMIN_ACCOUNT_TABLE_GRID_COLUMNS =
  'minmax(200px, 1.5fr) minmax(180px, 1.2fr) minmax(92px, auto) minmax(128px, auto) minmax(108px, auto) 72px';

export const ADMIN_ACCOUNT_TABLE_HEADERS = [
  'Người dùng',
  'Email',
  'Vai trò',
  'Trạng thái',
  'Ngày tạo',
  'Hành động',
];

/** Layout dùng chung cho header + row — tránh lệch cột. */
export const ADMIN_ACCOUNT_TABLE_LAYOUT_SX = {
  gridTemplateColumns: ADMIN_ACCOUNT_TABLE_GRID_COLUMNS,
  columnGap: 2,
  px: 2.25,
  alignItems: 'center',
  width: '100%',
  boxSizing: 'border-box',
};

export function getAdminAccountHeaderCellSx(index, total = ADMIN_ACCOUNT_TABLE_HEADERS.length) {
  if (index === total - 1) {
    return { textAlign: 'right', justifySelf: 'end' };
  }
  return { minWidth: 0, justifySelf: 'start' };
}

export const ADMIN_ACCOUNT_ROLE_LABELS = {
  Admin: 'Admin',
  Mentor: 'Mentor',
  Student: 'Student',
};

export const ADMIN_ACCOUNT_STATUS_LABELS = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa',
};

export const ADMIN_ACCOUNT_ROLE_CHIP_SX = {
  Admin: {
    bgcolor: 'rgba(124,58,237,0.10)',
    color: '#7C3AED',
    border: '1px solid rgba(124,58,237,0.22)',
  },
  Mentor: {
    bgcolor: 'rgba(8,145,178,0.10)',
    color: '#0891B2',
    border: '1px solid rgba(8,145,178,0.22)',
  },
  Student: {
    bgcolor: 'rgba(37,99,235,0.10)',
    color: '#2563EB',
    border: '1px solid rgba(37,99,235,0.22)',
  },
};

export const ADMIN_ACCOUNT_STATUS_CHIP_SX = {
  ACTIVE: {
    bgcolor: 'rgba(4,120,87,0.12)',
    color: '#047857',
    border: '1px solid rgba(4,120,87,0.24)',
  },
  LOCKED: {
    bgcolor: 'rgba(220,38,38,0.08)',
    color: '#DC2626',
    border: '1px solid rgba(220,38,38,0.22)',
  },
};

const ROLE_ORDER = { Admin: 0, Mentor: 1, Student: 2 };

export function getAccountInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function formatAccountDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatAccountDateOfBirth(value) {
  if (!value) return '—';
  const raw = String(value).trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  return formatAccountDate(raw);
}

export function formatAccountDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function normalizeAccount(raw = {}) {
  return {
    id: raw.id,
    fullName: raw.fullName ?? '',
    username: raw.username ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    dateOfBirth: raw.dateOfBirth ?? '',
    role: raw.role ?? 'Student',
    status: raw.status ?? 'ACTIVE',
    createdAt: raw.createdAt ?? null,
    lastLoginAt: raw.lastLoginAt ?? null,
  };
}

export function filterAndSortAccounts(accounts = [], query = {}) {
  const { q = '', role = 'all', status = 'all', sort = 'newest' } = query;
  const keyword = q.trim().toLowerCase();

  let result = accounts.filter((account) => {
    if (role !== 'all' && account.role !== role) return false;
    if (status !== 'all' && account.status !== status) return false;

    if (keyword) {
      const haystack = [account.fullName, account.email, account.username, account.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });

  result = [...result].sort((a, b) => {
    if (sort === 'name_asc') {
      return a.fullName.localeCompare(b.fullName, 'vi');
    }
    if (sort === 'role') {
      const diff = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
      if (diff !== 0) return diff;
      return a.fullName.localeCompare(b.fullName, 'vi');
    }
    const dateA = new Date(a.createdAt ?? 0).getTime();
    const dateB = new Date(b.createdAt ?? 0).getTime();
    return dateB - dateA;
  });

  return result;
}

export function validateAccountEditForm(values = {}) {
  const errors = {};
  if (!values.role) {
    errors.role = 'Vui lòng chọn vai trò';
  }
  if (!values.status) {
    errors.status = 'Vui lòng chọn trạng thái';
  }
  return errors;
}

export function hasAccountEditErrors(errors = {}) {
  return Object.keys(errors).length > 0;
}

export function validateAccountForm(values = {}, { isEdit = false } = {}) {
  const errors = {};
  const fullName = String(values.fullName ?? '').trim();
  const email = String(values.email ?? '').trim();
  const dateOfBirth = String(values.dateOfBirth ?? '').trim();
  const role = values.role;
  const status = values.status;
  const tempPassword = String(values.tempPassword ?? '').trim();

  if (!fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên';
  }

  if (!email) {
    errors.email = 'Vui lòng nhập email';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không hợp lệ';
  }

  if (!isEdit) {
    if (!dateOfBirth) {
      errors.dateOfBirth = 'Vui lòng chọn ngày sinh';
    } else {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(dob.getTime())) {
        errors.dateOfBirth = 'Ngày sinh không hợp lệ';
      } else if (dob >= today) {
        errors.dateOfBirth = 'Ngày sinh phải trước hôm nay';
      }
    }
  }

  if (!role) {
    errors.role = 'Vui lòng chọn vai trò';
  }

  if (!status) {
    errors.status = 'Vui lòng chọn trạng thái';
  }

  if (!isEdit && !tempPassword) {
    errors.tempPassword = 'Vui lòng nhập mật khẩu tạm thời';
  }

  return errors;
}

export function hasAccountFormErrors(errors = {}) {
  return Object.keys(errors).length > 0;
}
