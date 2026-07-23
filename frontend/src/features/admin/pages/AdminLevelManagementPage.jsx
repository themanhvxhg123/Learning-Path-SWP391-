import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';
import AppButton from '@/shared/ui/AppButton';
import AppPagination from '@/shared/ui/AppPagination';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import AdminCatalogToolbar from '@/features/admin/components/AdminCatalogToolbar';
import AdminLevelList from '@/features/admin/components/AdminLevelList';
import AdminLevelCreateDialog from '@/features/admin/components/AdminLevelCreateDialog';
import AdminLevelEditDialog from '@/features/admin/components/AdminLevelEditDialog';
import {
  ADMIN_CATALOG_STATUS_FILTER_OPTIONS,
  ADMIN_LEVEL_SORT_OPTIONS,
} from '@/features/admin/data/adminCatalogConstants';
import {
  createLevel,
  getLevels,
  updateLevel,
  deleteLevel,
} from '@/features/admin/services/adminLevelService';
import { filterAndSortLevels } from '@/features/admin/utils/adminLevelUtils';
import {
  ADMIN_LEVEL_LIST_DEFAULTS,
  ADMIN_LEVEL_LIST_PAGE_SIZE,
  buildAdminLevelActiveChips,
  buildAdminLevelListSearchParams,
  hasActiveAdminLevelFilters,
  paginateLevels,
  parseAdminLevelListParams,
  resetAdminLevelListParams,
} from '@/features/admin/utils/adminLevelUtils';
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PAGE_SIZE = ADMIN_LEVEL_LIST_PAGE_SIZE;

export default function AdminLevelManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingLevel, setDeletingLevel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const queryState = useMemo(
    () => parseAdminLevelListParams(searchParams),
    [searchParams],
  );

  const showReset = hasActiveAdminLevelFilters(queryState);

  const activeFilterChips = useMemo(
    () => buildAdminLevelActiveChips(queryState, ADMIN_CATALOG_STATUS_FILTER_OPTIONS),
    [queryState],
  );

  const loadLevels = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getLevels();
      if (res.ok) {
        setLevels(res.levels ?? []);
      } else {
        setLevels([]);
        setLoadError(true);
      }
    } catch {
      setLevels([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const updateQuery = (patch) => {
    setSearchParams(
      buildAdminLevelListSearchParams({ ...queryState, ...patch }, searchParams),
      { replace: true },
    );
  };

  const filteredLevels = useMemo(
    () => filterAndSortLevels(levels, queryState),
    [levels, queryState],
  );

  const pagination = useMemo(
    () => paginateLevels(filteredLevels, queryState.page, PAGE_SIZE),
    [filteredLevels, queryState.page],
  );

  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page]);

  const existingNames = useMemo(
    () =>
      levels
        .filter((item) => item.id !== editingLevel?.id)
        .map((item) => item.displayName.trim().toLowerCase()),
    [levels, editingLevel],
  );

  const handleStatusChange = (value) => updateQuery({ status: value, page: 1 });
  const handleSortChange = (value) => updateQuery({ sort: value, page: 1 });
  const handlePageChange = (page) => {
    updateQuery({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleReset = () =>
    setSearchParams(resetAdminLevelListParams(searchParams), { replace: true });
  const handleRemoveChip = ({ type }) => {
    const defaults = {
      q: '',
      status: ADMIN_LEVEL_LIST_DEFAULTS.status,
    };
    if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
  };

  const openEditDialog = (level) => {
    setEditingLevel(level);
    setEditOpen(true);
  };

  const handleCreateSubmit = async (values) => {
    setCreating(true);
    try {
      const res = await createLevel(values);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể tạo trình độ');
        return;
      }
      toast.success('Đã tạo trình độ mới');
      setCreateOpen(false);
      await loadLevels();
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (values) => {
    if (!editingLevel) return;

    setSaving(true);
    try {
      const res = await updateLevel(editingLevel.id, values);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể cập nhật trình độ');
        return;
      }
      toast.success('Đã cập nhật trình độ');
      setEditOpen(false);
      setEditingLevel(null);
      await loadLevels();
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (level) => {
    setDeletingLevel(level);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLevel) return;

    setDeleting(true);
    try {
      const res = await deleteLevel(deletingLevel.id);
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể xoá trình độ');
        return;
      }
      toast.success('Đã xoá trình độ thành công');
      setDeleteConfirmOpen(false);
      setDeletingLevel(null);
      await loadLevels();
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
            Quản lý trình độ
          </Typography>
          <Typography sx={{ fontSize: 14, color: MUTED, mt: 0.5, lineHeight: 1.55, maxWidth: 560 }}>
            Thêm, chỉnh sửa và sắp xếp trình độ khóa học (Cơ bản, Trung cấp, Nâng cao...).
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
          Tạo trình độ
        </AppButton>
      </Box>

      <AdminCatalogToolbar
        statusFilter={queryState.status}
        onStatusChange={handleStatusChange}
        sortBy={queryState.sort}
        onSortChange={handleSortChange}
        showReset={showReset}
        onReset={handleReset}
        totalCount={filteredLevels.length}
        countLabel="trình độ"
        CountIcon={LayersOutlinedIcon}
        activeFilterChips={activeFilterChips}
        onRemoveFilterChip={handleRemoveChip}
        sortOptions={ADMIN_LEVEL_SORT_OPTIONS}
      />

      <AdminLevelList
        levels={pagination.items}
        loading={loading}
        error={loadError}
        hasAnyLevels={levels.length > 0}
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

      <AdminLevelCreateDialog
        open={createOpen}
        onClose={() => {
          if (creating) return;
          setCreateOpen(false);
        }}
        onSubmit={handleCreateSubmit}
        saving={creating}
        existingNames={levels.map((item) => item.displayName.trim().toLowerCase())}
      />

      <AdminLevelEditDialog
        open={editOpen}
        onClose={() => {
          if (saving) return;
          setEditOpen(false);
          setEditingLevel(null);
        }}
        level={editingLevel}
        onSubmit={handleEditSubmit}
        saving={saving}
        existingNames={existingNames}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteConfirmOpen(false);
          setDeletingLevel(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xoá trình độ"
        message={
          deletingLevel
            ? `Bạn có chắc chắn muốn xoá trình độ "${deletingLevel.displayName}"? Hành động này không thể hoàn tác.`
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
