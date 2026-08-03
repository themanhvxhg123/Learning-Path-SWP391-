// ===== AdminLevelManagementPage.jsx =====
// Trang quản lý trình độ khóa học - hiển thị danh sách, lọc, tìm kiếm, tạo mới và chỉnh sửa trình độ.
// Đây là trang chính cho phần "Quản lý trình độ" trong menu Admin.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';  // Component hiển thị thông báo (toast message)
import AppButton from '@/shared/ui/AppButton';  // Nút bấm tùy chỉnh
import AppPagination from '@/shared/ui/AppPagination';  // Component phân trang
import AdminCatalogToolbar from '@/features/admin/components/AdminCatalogToolbar';  // Thanh công cụ (lọc, sắp xếp)
import AdminLevelList from '@/features/admin/components/AdminLevelList';  // Bảng danh sách trình độ
import AdminLevelCreateDialog from '@/features/admin/components/AdminLevelCreateDialog';  // Dialog tạo trình độ mới
import AdminLevelEditDialog from '@/features/admin/components/AdminLevelEditDialog';  // Dialog chỉnh sửa trình độ
import {
  ADMIN_CATALOG_STATUS_FILTER_OPTIONS,  // Danh sách trạng thái để lọc (Tất cả, Active, Inactive)
  ADMIN_LEVEL_SORT_OPTIONS,              // Các tùy chọn sắp xếp (Tên A-Z, Ngày tạo mới nhất...)
} from '@/features/admin/data/adminCatalogConstants';
import {
  createLevel,   // API tạo trình độ mới
  getLevels,     // API lấy danh sách trình độ
  updateLevel,   // API cập nhật trình độ
} from '@/features/admin/services/adminLevelService';
import { filterAndSortLevels } from '@/features/admin/utils/adminLevelUtils';  // Hàm lọc & sắp xếp
import {
  ADMIN_LEVEL_LIST_DEFAULTS,        // Giá trị mặc định cho bộ lọc
  ADMIN_LEVEL_LIST_PAGE_SIZE,       // Số lượng trình độ mỗi trang
  buildAdminLevelActiveChips,       // Tạo danh sách chip lọc đang active
  buildAdminLevelListSearchParams,  // Tạo query params trên URL
  hasActiveAdminLevelFilters,       // Kiểm tra có bộ lọc nào đang active không
  paginateLevels,                   // Hàm phân trang
  parseAdminLevelListParams,        // Đọc query params từ URL
  resetAdminLevelListParams,        // Reset tất cả bộ lọc về mặc định
} from '@/features/admin/utils/adminLevelUtils';
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PAGE_SIZE = ADMIN_LEVEL_LIST_PAGE_SIZE;

export default function AdminLevelManagementPage() {
  // ===== State quản lý URL params (bộ lọc, trang, từ khóa tìm kiếm) =====
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== State quản lý dữ liệu =====
  const [levels, setLevels] = useState([]);    // Danh sách trình độ từ API
  const [loading, setLoading] = useState(true); // Đang tải dữ liệu?
  const [loadError, setLoadError] = useState(false); // Có lỗi khi tải?

  // ===== State quản lý dialog =====
  const [createOpen, setCreateOpen] = useState(false);     // Dialog tạo mới đang mở?
  const [editOpen, setEditOpen] = useState(false);         // Dialog chỉnh sửa đang mở?
  const [editingLevel, setEditingLevel] = useState(null);  // Trình độ đang được sửa
  const [saving, setSaving] = useState(false);   // Đang lưu dữ liệu?
  const [creating, setCreating] = useState(false); // Đang tạo mới?

  // ===== Đọc query params từ URL và parse thành object =====
  const queryState = useMemo(
    () => parseAdminLevelListParams(searchParams),
    [searchParams],
  );

  // Kiểm tra xem có bộ lọc nào đang được bật không (để hiển thị nút Reset)
  const showReset = hasActiveAdminLevelFilters(queryState);

  // Tạo danh sách chip hiển thị các bộ lọc đang active (VD: "Trạng thái: Active")
  const activeFilterChips = useMemo(
    () => buildAdminLevelActiveChips(queryState, ADMIN_CATALOG_STATUS_FILTER_OPTIONS),
    [queryState],
  );

  // ===== Hàm tải danh sách trình độ từ API =====
  const loadLevels = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getLevels();  // Gọi API lấy danh sách trình độ
      if (res.ok) {
        setLevels(res.levels ?? []);  // Lưu danh sách vào state
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

  // Tự động tải danh sách khi component được mount
  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  // ===== Hàm cập nhật query params trên URL =====
  const updateQuery = (patch) => {
    setSearchParams(
      buildAdminLevelListSearchParams({ ...queryState, ...patch }, searchParams),
      { replace: true },  // replace: true để không tạo thêm lịch sử trình duyệt
    );
  };

  // ===== Lọc và sắp xếp danh sách trình độ dựa trên query params =====
  const filteredLevels = useMemo(
    () => filterAndSortLevels(levels, queryState),
    [levels, queryState],
  );

  // ===== Phân trang: chia danh sách đã lọc thành các trang =====
  const pagination = useMemo(
    () => paginateLevels(filteredLevels, queryState.page, PAGE_SIZE),
    [filteredLevels, queryState.page],
  );

  // Tự động điều chỉnh trang nếu trang hiện tại vượt quá tổng số trang
  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page]);

  // ===== Lấy danh sách tên trình độ hiện có (để kiểm tra trùng tên khi tạo/sửa) =====
  const existingNames = useMemo(
    () =>
      levels
        .filter((item) => item.id !== editingLevel?.id)  // Loại trừ trình độ đang sửa
        .map((item) => item.displayName.trim().toLowerCase()),
    [levels, editingLevel],
  );

  // ===== Các hàm xử lý sự kiện =====
  const handleStatusChange = (value) => updateQuery({ status: value, page: 1 });  // Đổi lọc trạng thái -> về trang 1
  const handleSortChange = (value) => updateQuery({ sort: value, page: 1 });       // Đổi cách sắp xếp -> về trang 1
  const handlePageChange = (page) => {         // Chuyển trang
    updateQuery({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });  // Cuộn lên đầu trang
  };
  const handleReset = () =>
    setSearchParams(resetAdminLevelListParams(searchParams), { replace: true });  // Reset bộ lọc
  const handleRemoveChip = ({ type }) => {  // Xóa 1 chip lọc cụ thể
    const defaults = {
      q: '',
      status: ADMIN_LEVEL_LIST_DEFAULTS.status,
    };
    if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
  };

  // Mở dialog chỉnh sửa trình độ
  const openEditDialog = (level) => {
    setEditingLevel(level);
    setEditOpen(true);
  };

  // Xử lý khi submit form tạo trình độ mới
  const handleCreateSubmit = async (values) => {
    setCreating(true);
    try {
      const res = await createLevel(values);  // Gọi API tạo trình độ
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể tạo trình độ');
        return;
      }
      toast.success('Đã tạo trình độ mới');
      setCreateOpen(false);
      await loadLevels();  // Tải lại danh sách sau khi tạo
    } finally {
      setCreating(false);
    }
  };

  // Xử lý khi submit form chỉnh sửa trình độ
  const handleEditSubmit = async (values) => {
    if (!editingLevel) return;

    setSaving(true);
    try {
      const res = await updateLevel(editingLevel.id, values);  // Gọi API cập nhật
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể cập nhật trình độ');
        return;
      }
      toast.success('Đã cập nhật trình độ');
      setEditOpen(false);
      setEditingLevel(null);
      await loadLevels();  // Tải lại danh sách sau khi cập nhật
    } finally {
      setSaving(false);
    }
  };

  // ===== Giao diện trang =====
  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      {/* Phần tiêu đề trang và nút "Tạo trình độ" */}
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

        {/* Nút mở dialog tạo trình độ mới */}
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

      {/* Thanh công cụ: bộ lọc trạng thái, sắp xếp, chip lọc active */}
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

      {/* Bảng danh sách trình độ */}
      <AdminLevelList
        levels={pagination.items}
        loading={loading}
        error={loadError}
        hasAnyLevels={levels.length > 0}
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

      {/* Dialog tạo trình độ mới */}
      <AdminLevelCreateDialog
        open={createOpen}
        onClose={() => {
          if (creating) return;  // Không cho đóng khi đang tạo
          setCreateOpen(false);
        }}
        onSubmit={handleCreateSubmit}
        saving={creating}
        existingNames={levels.map((item) => item.displayName.trim().toLowerCase())}
      />

      {/* Dialog chỉnh sửa trình độ */}
      <AdminLevelEditDialog
        open={editOpen}
        onClose={() => {
          if (saving) return;  // Không cho đóng khi đang lưu
          setEditOpen(false);
          setEditingLevel(null);
        }}
        level={editingLevel}
        onSubmit={handleEditSubmit}
        saving={saving}
        existingNames={existingNames}
      />
    </Box>
  );
}
