import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';
import AppButton from '@/shared/ui/AppButton';
import AppPagination from '@/shared/ui/AppPagination';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import AdminCatalogToolbar from '@/features/admin/components/AdminCatalogToolbar';
import AdminCategoryList from '@/features/admin/components/AdminCategoryList';
import AdminCategoryCreateDialog from '@/features/admin/components/AdminCategoryCreateDialog';
import AdminCategoryEditDialog from '@/features/admin/components/AdminCategoryEditDialog';
import {
  ADMIN_CATALOG_STATUS_FILTER_OPTIONS,
  ADMIN_CATEGORY_SORT_OPTIONS,
} from '@/features/admin/data/adminCatalogConstants';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from '@/features/admin/services/adminCategoryService';
import { filterAndSortCategories } from '@/features/admin/utils/adminCategoryUtils';
import {
  ADMIN_CATEGORY_LIST_DEFAULTS,
  ADMIN_CATEGORY_LIST_PAGE_SIZE,
  buildAdminCategoryActiveChips,
  buildAdminCategoryListSearchParams,
  hasActiveAdminCategoryFilters,
  paginateCategories,
  parseAdminCategoryListParams,
  resetAdminCategoryListParams,
} from '@/features/admin/utils/adminCategoryUtils';
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PAGE_SIZE = ADMIN_CATEGORY_LIST_PAGE_SIZE;

export default function AdminCategoryManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const queryState = useMemo(
    () => parseAdminCategoryListParams(searchParams),
    [searchParams],
  );

  const showReset = hasActiveAdminCategoryFilters(queryState);

  const activeFilterChips = useMemo(
    () =>
      buildAdminCategoryActiveChips(queryState, ADMIN_CATALOG_STATUS_FILTER_OPTIONS),
    [queryState],
  );

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getCategories();
      if (res.ok) {
        setCategories(res.categories ?? []);
      } else {
        setCategories([]);
        setLoadError(true);
      }
    } catch {
      setCategories([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const updateQuery = (patch) => {
    setSearchParams(
      buildAdminCategoryListSearchParams({ ...queryState, ...patch }, searchParams),
      { replace: true },
    );
  };

  const filteredCategories = useMemo(
    () => filterAndSortCategories(categories, queryState),
    [categories, queryState],
  );

  const pagination = useMemo(
    () => paginateCategories(filteredCategories, queryState.page, PAGE_SIZE),
    [filteredCategories, queryState.page],
  );

  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page]);

  const existingNames = useMemo(
    () =>
      categories
        .filter((item) => item.id !== editingCategory?.id)
        .map((item) => item.displayName.trim().toLowerCase()),
    [categories, editingCategory],
  );

  const handleStatusChange = (value) => updateQuery({ status: value, page: 1 });
  const handleSortChange = (value) => updateQuery({ sort: value, page: 1 });
  const handlePageChange = (page) => {
    updateQuery({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleReset = () =>
    setSearchParams(resetAdminCategoryListParams(searchParams), { replace: true });
  const handleRemoveChip = ({ type }) => {
    const defaults = {
      q: '',
      status: ADMIN_CATEGORY_LIST_DEFAULTS.status,
    };
    if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setEditOpen(true);
  };

  const handleCreateSubmit = async (values) => {
    setCreating(true);
    try {
      const res = await createCategory(values);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể tạo danh mục');
        return;
      }
      toast.success('Đã tạo danh mục mới');
      setCreateOpen(false);
      await loadCategories();
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (values) => {
    if (!editingCategory) return;

    setSaving(true);
    try {
      const res = await updateCategory(editingCategory.id, values);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể cập nhật danh mục');
        return;
      }
      toast.success('Đã cập nhật danh mục');
      setEditOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (category) => {
    setDeletingCategory(category);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;

    setDeleting(true);
    try {
      const res = await deleteCategory(deletingCategory.id);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể xoá danh mục');
        return;
      }
      toast.success('Đã xoá danh mục thành công');
      setDeleteConfirmOpen(false);
      setDeletingCategory(null);
      await loadCategories();
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
            Quản lý danh mục
          </Typography>
          <Typography sx={{ fontSize: 14, color: MUTED, mt: 0.5, lineHeight: 1.55, maxWidth: 560 }}>
            Thêm, chỉnh sửa và sắp xếp danh mục khóa học (IELTS, Giao tiếp, Phát âm...).
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
          Tạo danh mục
        </AppButton>
      </Box>

      <AdminCatalogToolbar
        statusFilter={queryState.status}
        onStatusChange={handleStatusChange}
        sortBy={queryState.sort}
        onSortChange={handleSortChange}
        showReset={showReset}
        onReset={handleReset}
        totalCount={filteredCategories.length}
        countLabel="danh mục"
        CountIcon={CategoryOutlinedIcon}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveChip}
        sortOptions={ADMIN_CATEGORY_SORT_OPTIONS}
      />

      <AdminCategoryList
        categories={pagination.items}
        loading={loading}
        error={loadError}
        hasAnyCategories={categories.length > 0}
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

      <AdminCategoryCreateDialog
        open={createOpen}
        onClose={() => {
          if (creating) return;
          setCreateOpen(false);
        }}
        onSubmit={handleCreateSubmit}
        saving={creating}
        existingNames={categories.map((item) => item.displayName.trim().toLowerCase())}
      />

      <AdminCategoryEditDialog
        open={editOpen}
        onClose={() => {
          if (saving) return;
          setEditOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSubmit={handleEditSubmit}
        saving={saving}
        existingNames={existingNames}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
          setDeletingCategory(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xoá danh mục"
        message={
          deletingCategory
            ? `Bạn có chắc chắn muốn xoá danh mục "${deletingCategory.displayName}"? Hành động này không thể hoàn tác.`
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
