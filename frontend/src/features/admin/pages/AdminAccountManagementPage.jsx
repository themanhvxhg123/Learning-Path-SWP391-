import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { toast } from '@/shared/ui/Toast';
import AppButton from '@/shared/ui/AppButton';
import AppPagination from '@/shared/ui/AppPagination';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import AdminAccountsToolbar from '@/features/admin/components/AdminAccountsToolbar';
import AdminAccountList from '@/features/admin/components/AdminAccountList';
import AdminAccountFormDialog from '@/features/admin/components/AdminAccountFormDialog';
import AdminAccountCreateDialog from '@/features/admin/components/AdminAccountCreateDialog';
import { createAccount, getAccounts, updateAccount, deleteAccount } from '@/features/admin/services/adminAccountService';
import {
  ADMIN_ACCOUNT_ROLE_OPTIONS,
  ADMIN_ACCOUNT_STATUS_OPTIONS,
} from '@/features/admin/data/adminAccountsMock';
import { filterAndSortAccounts } from '@/features/admin/utils/adminAccountUtils';
import {
  ADMIN_ACCOUNT_LIST_DEFAULTS,
  ADMIN_ACCOUNT_LIST_PAGE_SIZE,
  buildAdminAccountActiveChips,
  buildAdminAccountListSearchParams,
  hasActiveAdminAccountFilters,
  paginateAccounts,
  parseAdminAccountListParams,
  resetAdminAccountListParams,
} from '@/features/admin/utils/adminAccountListParams';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PAGE_SIZE = ADMIN_ACCOUNT_LIST_PAGE_SIZE;

export default function AdminAccountManagementPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const queryState = useMemo(
    () => parseAdminAccountListParams(searchParams),
    [searchParams],
  );

  const showReset = hasActiveAdminAccountFilters(queryState);

  const activeFilterChips = useMemo(
    () =>
      buildAdminAccountActiveChips(queryState, {
        roleOptions: ADMIN_ACCOUNT_ROLE_OPTIONS,
        statusOptions: ADMIN_ACCOUNT_STATUS_OPTIONS,
      }),
    [queryState],
  );

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getAccounts();
      if (res.ok) {
        setAccounts(res.accounts ?? []);
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

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const updateQuery = (patch) => {
    setSearchParams(
      buildAdminAccountListSearchParams({ ...queryState, ...patch }, searchParams),
      { replace: true },
    );
  };

  const filteredAccounts = useMemo(
    () => filterAndSortAccounts(accounts, queryState),
    [accounts, queryState],
  );

  const pagination = useMemo(
    () => paginateAccounts(filteredAccounts, queryState.page, PAGE_SIZE),
    [filteredAccounts, queryState.page],
  );

  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page]);

  const handleRoleChange = (value) => updateQuery({ role: value, page: 1 });
  const handleStatusChange = (value) => updateQuery({ status: value, page: 1 });
  const handleSortChange = (value) => updateQuery({ sort: value, page: 1 });
  const handlePageChange = (page) => {
    updateQuery({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleReset = () => setSearchParams(resetAdminAccountListParams(searchParams), { replace: true });
  const handleRemoveChip = ({ type }) => {
    const defaults = {
      q: '',
      role: ADMIN_ACCOUNT_LIST_DEFAULTS.role,
      status: ADMIN_ACCOUNT_LIST_DEFAULTS.status,
    };
    if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
  };

  const openEditDialog = (account) => {
    setEditingAccount(account);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values) => {
    if (!editingAccount) return;

    setSaving(true);
    try {
      const res = await updateAccount(editingAccount.id, values);

      if (!res.ok) {
        toast.error(res.message ?? 'Không thể cập nhật tài khoản');
        return;
      }

      toast.success('Đã cập nhật vai trò và trạng thái tài khoản');
      setFormOpen(false);
      setEditingAccount(null);
      await loadAccounts();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (values) => {
    setCreating(true);
    try {
      const res = await createAccount(values);

      if (!res.ok) {
        toast.error(res.message ?? 'Không thể tạo tài khoản');
        return;
      }

      toast.success('Đã tạo tài khoản mới');
      setCreateOpen(false);
      await loadAccounts();
    } finally {
      setCreating(false);
    }
  };

  const openDeleteConfirm = (account) => {
    setDeletingAccount(account);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAccount) return;

    setDeleting(true);
    try {
      const res = await deleteAccount(deletingAccount.id);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể xoá tài khoản');
        return;
      }
      toast.success('Đã xoá tài khoản thành công');
      setDeleteConfirmOpen(false);
      setDeletingAccount(null);
      await loadAccounts();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
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

      <AdminAccountList
        accounts={pagination.items}
        loading={loading}
        error={loadError}
        hasAnyAccounts={accounts.length > 0}
        isFiltered={showReset || Boolean(queryState.q?.trim())}
        onEdit={openEditDialog}
        onDelete={openDeleteConfirm}
        onClearFilters={handleReset}
      />

      <AppPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />

      <AdminAccountFormDialog
        open={formOpen}
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSubmit={handleFormSubmit}
        saving={saving}
        currentUserId={user?.userId}
      />

      <AdminAccountCreateDialog
        open={createOpen}
        onClose={() => {
          if (creating) return;
          setCreateOpen(false);
        }}
        onSubmit={handleCreateSubmit}
        saving={creating}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
          setDeletingAccount(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xoá tài khoản"
        message={
          deletingAccount
            ? `Bạn có chắc chắn muốn xoá tài khoản "${deletingAccount.fullName}" (${deletingAccount.email})? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xoá"
        cancelLabel="Hủy"
        loading={deleting}
        destructive
      />
    </Box>
  );
}
