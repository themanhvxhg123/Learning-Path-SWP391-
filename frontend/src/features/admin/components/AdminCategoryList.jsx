import { Box, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import EmptyState from '@/shared/ui/EmptyState';
import Loading from '@/shared/ui/Loading';
import AdminCategoryRow from './AdminCategoryRow';
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  ADMIN_CATEGORY_TABLE_GRID_COLUMNS,
  ADMIN_CATEGORY_TABLE_HEADERS,
} from '@/features/admin/utils/adminCategoryUtils';

const TABLE_ROW_SX = {
  display: { xs: 'none', md: 'grid' },
  gridTemplateColumns: ADMIN_CATEGORY_TABLE_GRID_COLUMNS,
  gap: 2,
  px: 2.25,
  alignItems: 'center',
};

function ListHeader() {
  return (
    <Box
      sx={{
        ...TABLE_ROW_SX,
        py: 1.25,
        bgcolor: 'rgba(15,23,42,0.02)',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      {ADMIN_CATEGORY_TABLE_HEADERS.map((label, index) => (
        <Typography
          key={label}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            textAlign: index === ADMIN_CATEGORY_TABLE_HEADERS.length - 1 ? 'right' : 'left',
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

export default function AdminCategoryList({
  categories,
  loading,
  error,
  hasAnyCategories,
  isFiltered,
  onEdit,
  onDelete,
  onClearFilters,
}) {
  if (loading) {
    return <Loading message="Đang tải danh sách danh mục..." />;
  }

  if (error) {
    return (
      <EmptyState
        embedded
        title="Không thể tải danh sách danh mục."
        description="Vui lòng thử lại."
      />
    );
  }

  if (!hasAnyCategories) {
    return (
      <EmptyState
        embedded
        icon={CategoryOutlinedIcon}
        title="Chưa có danh mục nào."
        description="Danh sách danh mục sẽ hiển thị tại đây khi có dữ liệu."
      />
    );
  }

  if (categories.length === 0 && isFiltered) {
    return (
      <EmptyState
        embedded
        icon={SearchOffOutlinedIcon}
        title="Không tìm thấy danh mục nào."
        description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
        actionLabel="Xóa bộ lọc"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <Box
      sx={{
        borderRadius: '16px',
        border: '1px solid rgba(15,23,42,0.08)',
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      <ListHeader />
      {categories.map((category) => (
        <AdminCategoryRow key={category.id} category={category} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </Box>
  );
}
