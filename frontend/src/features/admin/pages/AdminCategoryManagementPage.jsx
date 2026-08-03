// ===== AdminCategoryManagementPage.jsx =====
// Trang quản lý danh mục khóa học - hiển thị danh sách, lọc, tìm kiếm, tạo mới và chỉnh sửa danh mục.
// Đây là trang chính cho phần "Quản lý danh mục" trong menu Admin.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/shared/ui/Toast';  // Component hiển thị thông báo (toast message)
import AppButton from '@/shared/ui/AppButton';  // Nút bấm tùy chỉnh
import AppPagination from '@/shared/ui/AppPagination';  // Component phân trang
import AdminCatalogToolbar from '@/features/admin/components/AdminCatalogToolbar';  // Thanh công cụ (lọc, sắp xếp)
import AdminCategoryList from '@/features/admin/components/AdminCategoryList';  // Bảng danh sách danh mục
import AdminCategoryCreateDialog from '@/features/admin/components/AdminCategoryCreateDialog';  // Dialog tạo danh mục mới
import AdminCategoryEditDialog from '@/features/admin/components/AdminCategoryEditDialog';  // Dialog chỉnh sửa danh mục
import {
  ADMIN_CATALOG_STATUS_FILTER_OPTIONS,  // Danh sách trạng thái để lọc (Tất cả, Active, Inactive)
  ADMIN_CATEGORY_SORT_OPTIONS,           // Các tùy chọn sắp xếp (Tên A-Z, Ngày tạo mới nhất...)
} from '@/features/admin/data/adminCatalogConstants';
import {
  createCategory,   // API tạo danh mục mới
  getCategories,    // API lấy danh sách danh mục
  updateCategory,   // API cập nhật danh mục
} from '@/features/admin/services/adminCategoryService';
import { filterAndSortCategories } from '@/features/admin/utils/adminCategoryUtils';  // Hàm lọc & sắp xếp
import {
  ADMIN_CATEGORY_LIST_DEFAULTS,        // Giá trị mặc định cho bộ lọc
  ADMIN_CATEGORY_LIST_PAGE_SIZE,       // Số lượng danh mục mỗi trang
  buildAdminCategoryActiveChips,       // Tạo danh sách chip lọc đang active
  buildAdminCategoryListSearchParams,  // Tạo query params trên URL
  hasActiveAdminCategoryFilters,       // Kiểm tra có bộ lọc nào đang active không
  paginateCategories,                  // Hàm phân trang
  parseAdminCategoryListParams,        // Đọc query params từ URL
  resetAdminCategoryListParams,        // Reset tất cả bộ lọc về mặc định
} from '@/features/admin/utils/adminCategoryUtils';
import { TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

const PAGE_SIZE = ADMIN_CATEGORY_LIST_PAGE_SIZE;

export default function AdminCategoryManagementPage() {
  // ===== State quản lý URL params (bộ lọc, trang, từ khóa tìm kiếm) =====
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== State quản lý dữ liệu =====
  const [categories, setCategories] = useState([]);    // Danh sách danh mục từ API
  const [loading, setLoading] = useState(true);         // Đang tải dữ liệu?
  const [loadError, setLoadError] = useState(false);     // Có lỗi khi tải?

  // ===== State quản lý dialog =====
  const [createOpen, setCreateOpen] = useState(false);       // Dialog tạo mới đang mở?
  const [editOpen, setEditOpen] = useState(false);           // Dialog chỉnh sửa đang mở?
  const [editingCategory, setEditingCategory] = useState(null);  // Danh mục đang được sửa
  const [saving, setSaving] = useState(false);   // Đang lưu dữ liệu?
  const [creating, setCreating] = useState(false); // Đang tạo mới?

  // ===== Đọc query params từ URL và parse thành object =====
  const queryState = useMemo(
    () => parseAdminCategoryListParams(searchParams),
    [searchParams],
  );

  // Kiểm tra xem có bộ lọc nào đang được bật không (để hiển thị nút Reset)
  const showReset = hasActiveAdminCategoryFilters(queryState);

  // Tạo danh sách chip hiển thị các bộ lọc đang active (VD: "Trạng thái: Active")
  const activeFilterChips = useMemo(
    () =>
      buildAdminCategoryActiveChips(queryState, ADMIN_CATALOG_STATUS_FILTER_OPTIONS),
    [queryState],
  );

  // ===== Hàm tải danh sách danh mục từ API =====
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getCategories();  // Gọi API lấy danh sách danh mục
      if (res.ok) {
        setCategories(res.categories ?? []);  // Lưu danh sách vào state
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

  // Tự động tải danh sách khi component được mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ===== Hàm cập nhật query params trên URL =====
  const updateQuery = (patch) => {
    setSearchParams(
      buildAdminCategoryListSearchParams({ ...queryState, ...patch }, searchParams),
      { replace: true },  // replace: true để không tạo thêm lịch sử trình duyệt
    );
  };

  // ===== Lọc và sắp xếp danh sách danh mục dựa trên query params =====
  const filteredCategories = useMemo(
    () => filterAndSortCategories(categories, queryState),
    [categories, queryState],
  );

  // ===== Phân trang: chia danh sách đã lọc thành các trang =====
  const pagination = useMemo(
    () => paginateCategories(filteredCategories, queryState.page, PAGE_SIZE),
    [filteredCategories, queryState.page],
  );

  // Tự động điều chỉnh trang nếu trang hiện tại vượt quá tổng số trang
  useEffect(() => {
    if (!loading && queryState.page !== pagination.page) {
      updateQuery({ page: pagination.page });
    }
  }, [loading, queryState.page, pagination.page]);

  // ===== Lấy danh sách tên danh mục hiện có (để kiểm tra trùng tên khi tạo/sửa) =====
  const existingNames = useMemo(
    () =>
      categories
        .filter((item) => item.id !== editingCategory?.id)  // Loại trừ danh mục đang sửa
        .map((item) => item.displayName.trim().toLowerCase()),
    [categories, editingCategory],
  );

  // ===== Các hàm xử lý sự kiện =====
  const handleStatusChange = (value) => updateQuery({ status: value, page: 1 });  // Đổi lọc trạng thái -> về trang 1
  const handleSortChange = (value) => updateQuery({ sort: value, page: 1 });       // Đổi cách sắp xếp -> về trang 1
  const handlePageChange = (page) => {         // Chuyển trang
    updateQuery({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });  // Cuộn lên đầu trang
  };
  const handleReset = () =>
    setSearchParams(resetAdminCategoryListParams(searchParams), { replace: true });  // Reset bộ lọc
  const handleRemoveChip = ({ type }) => {  // Xóa 1 chip lọc cụ thể
    const defaults = {
      q: '',
      status: ADMIN_CATEGORY_LIST_DEFAULTS.status,
    };
    if (type in defaults) updateQuery({ [type]: defaults[type], page: 1 });
  };

  // Mở dialog chỉnh sửa danh mục
  const openEditDialog = (category) => {
    setEditingCategory(category);
    setEditOpen(true);
  };

  // Xử lý khi submit form tạo danh mục mới
  const handleCreateSubmit = async (values) => {
    setCreating(true);
    try {
      const res = await createCategory(values);  // Gọi API tạo danh mục
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể tạo danh mục');
        return;
      }
      toast.success('Đã tạo danh mục mới');
      setCreateOpen(false);
      await loadCategories();  // Tải lại danh sách sau khi tạo
    } finally {
      setCreating(false);
    }
  };

  // Xử lý khi submit form chỉnh sửa danh mục
  const handleEditSubmit = async (values) => {
    if (!editingCategory) return;

    setSaving(true);
    try {
      const res = await updateCategory(editingCategory.id, values);  // Gọi API cập nhật
      if (!res.ok) {
        toast.error(res.message ?? 'Không thể cập nhật danh mục');
        return;
      }
      toast.success('Đã cập nhật danh mục');
      setEditOpen(false);
      setEditingCategory(null);
      await loadCategories();  // Tải lại danh sách sau khi cập nhật
    } finally {
      setSaving(false);
    }
  };

  // ===== Giao diện trang =====
  return (
    <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
      {/* Phần tiêu đề trang và nút "Tạo danh mục" */}
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

        {/* Nút mở dialog tạo danh mục mới */}
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

      {/* Thanh công cụ: bộ lọc trạng thái, sắp xếp, chip lọc active */}
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

      {/* Bảng danh sách danh mục */}
      <AdminCategoryList
        categories={pagination.items}
        loading={loading}
        error={loadError}
        hasAnyCategories={categories.length > 0}
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

      {/* Dialog tạo danh mục mới */}
      <AdminCategoryCreateDialog
        open={createOpen}
        onClose={() => {
          if (creating) return;  // Không cho đóng khi đang tạo
          setCreateOpen(false);
        }}
        onSubmit={handleCreateSubmit}
        saving={creating}
        existingNames={categories.map((item) => item.displayName.trim().toLowerCase())}
      />

      {/* Dialog chỉnh sửa danh mục */}
      <AdminCategoryEditDialog
        open={editOpen}
        onClose={() => {
          if (saving) return;  // Không cho đóng khi đang lưu
          setEditOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSubmit={handleEditSubmit}
        saving={saving}
        existingNames={existingNames}
      />
    </Box>
  );
}
