// ===== AdminAccountManagementPage.jsx =====
// Trang quản lý tài khoản Admin - hiển thị danh sách, lọc, tìm kiếm, tạo mới và chỉnh sửa tài khoản.
// Đây là trang chính cho phần "Quản lý tài khoản" trong menu Admin.
//
// 📍 VỊ TRÍ TRONG LUỒNG CHỈNH SỬA (BƯỚC 3 - TRUNG TÂM ĐIỀU PHỐI):
// Đây là file "trung tâm" của luồng chỉnh sửa tài khoản. Nó nhận onEdit từ
// AdminAccountList, mở dialog chỉnh sửa, nhận kết quả từ dialog rồi gọi API.
// ➡️ Đến từ: AdminAccountList.jsx (dòng 114) — frontend/src/features/admin/components/AdminAccountList.jsx
// ➡️ Đi tiếp (mở dialog): AdminAccountFormDialog.jsx (dòng 117) — frontend/src/features/admin/components/AdminAccountFormDialog.jsx
// ➡️ Đi tiếp (gọi API): adminAccountService.js (dòng 54) — frontend/src/features/admin/services/adminAccountService.js


import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { toast } from '@/shared/ui/Toast';  // Component hiển thị thông báo (toast message)
import AppButton from '@/shared/ui/AppButton';  // Nút bấm tùy chỉnh
import AppPagination from '@/shared/ui/AppPagination';  // Component phân trang
import AdminAccountsToolbar from '@/features/admin/components/AdminAccountsToolbar';  // Thanh công cụ (lọc, sắp xếp)
import AdminAccountList from '@/features/admin/components/AdminAccountList';  // Bảng danh sách tài khoản
import AdminAccountFormDialog from '@/features/admin/components/AdminAccountFormDialog';  // Dialog chỉnh sửa tài khoản
import AdminAccountCreateDialog from '@/features/admin/components/AdminAccountCreateDialog';  // Dialog tạo tài khoản mới
import { createAccount, getAccounts, updateAccount } from '@/features/admin/services/adminAccountService';  // API calls
import {
  ADMIN_ACCOUNT_ROLE_OPTIONS,    // Danh sách vai trò (Admin, Mentor, Student)
  ADMIN_ACCOUNT_STATUS_OPTIONS,  // Danh sách trạng thái (Active, Inactive)
} from '@/features/admin/data/adminAccountsMock';
import { filterAndSortAccounts } from '@/features/admin/utils/adminAccountUtils';  // Hàm lọc & sắp xếp
import {
  ADMIN_ACCOUNT_LIST_DEFAULTS,        // Giá trị mặc định cho bộ lọc
  ADMIN_ACCOUNT_LIST_PAGE_SIZE,       // Số lượng tài khoản mỗi trang
  buildAdminAccountActiveChips,       // Tạo danh sách chip lọc đang active
  buildAdminAccountListSearchParams,  // Tạo query params trên URL
  hasActiveAdminAccountFilters,       // Kiểm tra có bộ lọc nào đang active không
  paginateAccounts,                   // Hàm phân trang
  parseAdminAccountListParams,        // Đọc query params từ URL
  resetAdminAccountListParams,        // Reset tất cả bộ lọc về mặc định
} from '@/features/admin/utils/adminAccountListParams';
import { useSearchParams } from 'react-router-dom';  // Hook đọc/ghi query params trên URL
import { useAuth } from '@/context/AuthContext';  // Hook lấy thông tin người dùng hiện tại
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PAGE_SIZE = ADMIN_ACCOUNT_LIST_PAGE_SIZE;

export default function AdminAccountManagementPage() {
  // ===== Lấy thông tin người dùng hiện tại (để kiểm tra không cho sửa chính mình) =====
  const { user } = useAuth();

  // ===== State quản lý URL params (bộ lọc, trang, từ khóa tìm kiếm) =====
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== State quản lý dữ liệu =====
  const [accounts, setAccounts] = useState([]);    // Danh sách tài khoản từ API
  const [loading, setLoading] = useState(true);     // Đang tải dữ liệu?
  const [loadError, setLoadError] = useState(false); // Có lỗi khi tải?

  // ===== State quản lý dialog =====
  const [formOpen, setFormOpen] = useState(false);      // Dialog chỉnh sửa đang mở?
  const [createOpen, setCreateOpen] = useState(false);   // Dialog tạo mới đang mở?
  const [editingAccount, setEditingAccount] = useState(null);  // Tài khoản đang được sửa
  const [saving, setSaving] = useState(false);   // Đang lưu dữ liệu?
  const [creating, setCreating] = useState(false); // Đang tạo mới?

  // ===== Đọc query params từ URL và parse thành object =====
  const queryState = useMemo(
    () => parseAdminAccountListParams(searchParams),
    [searchParams],
  );

  // Kiểm tra xem có bộ lọc nào đang được bật không (để hiển thị nút Reset)
  const showReset = hasActiveAdminAccountFilters(queryState);

  // Tạo danh sách chip hiển thị các bộ lọc đang active (VD: "Vai trò: Mentor", "Trạng thái: Active")
  const activeFilterChips = useMemo(
    () =>
      buildAdminAccountActiveChips(queryState, {
        roleOptions: ADMIN_ACCOUNT_ROLE_OPTIONS,
        statusOptions: ADMIN_ACCOUNT_STATUS_OPTIONS,
      }),
    [queryState],
  );

  // ===== Hàm tải danh sách tài khoản từ API =====
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getAccounts();  // Gọi API lấy danh sách tài khoản
      if (res.ok) {
        setAccounts(res.accounts ?? []);  // Lưu danh sách vào state
      } else {
        setAccounts([]);
        setLoadError(true);
      }
    } catch {
      setAccounts([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tự động tải danh sách khi component được mount
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ===== Hàm cập nhật query params trên URL =====
  const updateQuery = (patch) => {
    setSearchParams(
      buildAdminAccountListSearchParams({ ...queryState, ...patch }, searchParams),
      { replace: true },  // replace: true để không tạo thêm lịch sử trình duyệt
    );
  };

  // ===== Lọc và sắp xếp danh sách tài khoản dựa trên query params =====
  const filteredAccounts = useMemo(
    () => filterAndSortAccounts(accounts, queryState),
    [accounts, queryState],
  );

  // ===== Phân trang: chia danh sách đã lọc thành các trang =====
  const pagination = useMemo(
    () => paginateAccounts(filteredAccounts, queryState.page, PAGE_SIZE),
    [filteredAccounts, queryState.page],
  );

  // Tự động điều chỉnh trang nếu trang hiện tại vượt quá tổng số trang
  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page]);

  // ===== Các hàm xử lý sự kiện =====
  const handleRoleChange = (value) => updateQuery({ role: value, page: 1 });    // Đổi lọc vai trò -> về trang 1
  const handleStatusChange = (value) => updateQuery({ status: value, page: 1 }); // Đổi lọc trạng thái -> về trang 1
  const handleSortChange = (value) => updateQuery({ sort: value, page: 1 });     // Đổi cách sắp xếp -> về trang 1
  const handlePageChange = (page) => {       // Chuyển trang
    updateQuery({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });  // Cuộn lên đầu trang
  };
  const handleReset = () => setSearchParams(resetAdminAccountListParams(searchParams), { replace: true });  // Reset bộ lọc
  const handleRemoveChip = ({ type }) => {  // Xóa 1 chip lọc cụ thể
    const defaults = {
      q: '',
      role: ADMIN_ACCOUNT_LIST_DEFAULTS.role,
      status: ADMIN_ACCOUNT_LIST_DEFAULTS.status,
    };
    if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
  };

  // ===== HÀM MỞ DIALOG CHỈNH SỬA (BƯỚC 3a) =====
  // Đây là hàm được truyền xuống AdminAccountList qua prop onEdit (dòng 259).
  // CÁCH HOẠT ĐỘNG: Khi người dùng bấm nút sửa ở AdminAccountRow, hàm này được gọi
  // với object account. Nó lưu account vào state editingAccount và mở dialog (formOpen=true).
  // ➡️ Đến từ: AdminAccountList.jsx (dòng 114) — frontend/src/features/admin/components/AdminAccountList.jsx
  // ➡️ Đi tiếp: AdminAccountFormDialog.jsx (dòng 117) — frontend/src/features/admin/components/AdminAccountFormDialog.jsx
  const openEditDialog = (account) => {
    setEditingAccount(account);  // Lưu tài khoản đang sửa vào state
    setFormOpen(true);           // Mở dialog chỉnh sửa
  };

  // ===== HÀM XỬ LÝ SUBMIT FORM CHỈNH SỬA (BƯỚC 5) =====
  // Đây là hàm được truyền xuống AdminAccountFormDialog qua prop onSubmit (dòng 279).
  // CÁCH HOẠT ĐỘNG: Khi người dùng bấm "Lưu thay đổi" trong dialog, hàm này được gọi
  // với values = { role, status }. Nó gọi updateAccount() để gửi lên backend,
  // nếu thành công thì đóng dialog và tải lại danh sách.
  // ➡️ Đến từ: AdminAccountFormDialog.jsx (dòng 165) — frontend/src/features/admin/components/AdminAccountFormDialog.jsx
  // ➡️ Đi tiếp: adminAccountService.js (dòng 54) — frontend/src/features/admin/services/adminAccountService.js
  const handleFormSubmit = async (values) => {
    if (!editingAccount) return;

    setSaving(true);
    try {
      const res = await updateAccount(editingAccount.id, values);  // Gọi API cập nhật

      if (!res.ok) {
        toast.error(res.message ?? 'Không thể cập nhật tài khoản');
        return;
      }

      toast.success('Đã cập nhật vai trò và trạng thái tài khoản');
      setFormOpen(false);
      setEditingAccount(null);
      await loadAccounts();  // Tải lại danh sách sau khi cập nhật
    } finally {
      setSaving(false);
    }
  };


  // Xử lý khi submit form tạo tài khoản mới
  const handleCreateSubmit = async (values) => {
    setCreating(true);
    try {
      const res = await createAccount(values);  // Gọi API tạo tài khoản

      if (!res.ok) {
        toast.error(res.message ?? 'Không thể tạo tài khoản');
        return;
      }

      toast.success('Đã tạo tài khoản mới');
      setCreateOpen(false);
      await loadAccounts();  // Tải lại danh sách sau khi tạo
    } finally {
      setCreating(false);
    }
  };

  // ===== Giao diện trang =====
  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      {/* Phần tiêu đề trang và nút "Tạo tài khoản" */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1.5, sm: 2 },
          mb: 2.5,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 24 }, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
            Quản lý tài khoản
          </Typography>
          <Typography sx={{ fontSize: 14, color: MUTED, mt: 0.5, lineHeight: 1.55, maxWidth: 560 }}>
            Theo dõi và quản lý tài khoản Admin, Mentor và Học viên trong hệ thống.
          </Typography>
        </Box>

        {/* Nút mở dialog tạo tài khoản mới */}
        <AppButton
          startIcon={<AddRoundedIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{
            height: 44,
            px: 2.5,
            fontSize: 14,
            fontWeight: 700,
            borderRadius: '999px',
            bgcolor: '#0891B2',
            color: '#fff',
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            boxShadow: 'none',
            '&:hover': { bgcolor: '#0E7490', boxShadow: 'none' },
          }}
        >
          Tạo tài khoản
        </AppButton>
      </Box>

      {/* Thanh công cụ: bộ lọc vai trò, trạng thái, sắp xếp, chip lọc active */}
      <AdminAccountsToolbar
        roleFilter={queryState.role}
        onRoleChange={handleRoleChange}
        statusFilter={queryState.status}
        onStatusChange={handleStatusChange}
        sortBy={queryState.sort}
        onSortChange={handleSortChange}
        showReset={showReset}
        onReset={handleReset}
        totalCount={filteredAccounts.length}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveChip}
      />

      {/* Bảng danh sách tài khoản */}
      <AdminAccountList
        accounts={pagination.items}
        loading={loading}
        error={loadError}
        hasAnyAccounts={accounts.length > 0}
        isFiltered={showReset || Boolean(queryState.q?.trim())}
        onEdit={openEditDialog}
        onClearFilters={handleReset}
      />

      {/* Phân trang */}
      <AppPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />

      {/* Dialog chỉnh sửa tài khoản (sửa vai trò & trạng thái) */}
      <AdminAccountFormDialog
        open={formOpen}
        onClose={() => {
          if (saving) return;  // Không cho đóng khi đang lưu
          setFormOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSubmit={handleFormSubmit}
        saving={saving}
        currentUserId={user?.userId}  // Truyền ID người dùng hiện tại để không cho tự sửa chính mình
      />

      {/* Dialog tạo tài khoản mới */}
      <AdminAccountCreateDialog
        open={createOpen}
        onClose={() => {
          if (creating) return;  // Không cho đóng khi đang tạo
          setCreateOpen(false);
        }}
        onSubmit={handleCreateSubmit}
        saving={creating}
      />
    </Box>
  );
}
