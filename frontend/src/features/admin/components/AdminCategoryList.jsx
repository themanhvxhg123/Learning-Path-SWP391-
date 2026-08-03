// ===== AdminCategoryList.jsx =====
// Component hiển thị danh sách danh mục khóa học dưới dạng bảng.
// Xử lý các trạng thái: đang tải, lỗi, không có dữ liệu, không tìm thấy kết quả lọc.

import { Box, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import EmptyState from '@/shared/ui/EmptyState';   // Component hiển thị khi không có dữ liệu
import Loading from '@/shared/ui/Loading';           // Component hiển thị khi đang tải
import AdminCategoryRow from './AdminCategoryRow';   // Component cho từng dòng danh mục
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  ADMIN_CATEGORY_TABLE_GRID_COLUMNS,  // Cấu hình số cột grid
  ADMIN_CATEGORY_TABLE_HEADERS,        // Mảng chứa tên các cột
} from '@/features/admin/utils/adminCategoryUtils';

// Style cho dòng tiêu đề của bảng
const TABLE_ROW_SX = {
  display: { xs: 'none', md: 'grid' },  // Chỉ hiện trên desktop
  gridTemplateColumns: ADMIN_CATEGORY_TABLE_GRID_COLUMNS,
  gap: 2,
  px: 2.25,
  alignItems: 'center',
};

// Component con: hiển thị dòng tiêu đề của bảng
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
      {/* Duyệt qua mảng headers để hiển thị từng cột */}
      {ADMIN_CATEGORY_TABLE_HEADERS.map((label, index) => (
        <Typography
          key={label}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            // Cột cuối cùng (hành động) căn phải, các cột khác căn trái
            textAlign: index === ADMIN_CATEGORY_TABLE_HEADERS.length - 1 ? 'right' : 'left',
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

// Component chính: nhận danh sách danh mục và các hàm xử lý
export default function AdminCategoryList({
  categories,         // Mảng các danh mục cần hiển thị
  loading,            // true nếu đang tải dữ liệu từ API
  error,              // true nếu có lỗi khi tải
  hasAnyCategories,   // true nếu có ít nhất 1 danh mục trong hệ thống
  isFiltered,         // true nếu người dùng đang dùng bộ lọc
  onEdit,             // Hàm được gọi khi bấm nút sửa
  onClearFilters,     // Hàm được gọi khi bấm "Xóa bộ lọc"
}) {

  // Trường hợp 1: Đang tải dữ liệu -> hiển thị spinner
  if (loading) {
    return <Loading message="Đang tải danh sách danh mục..." />;
  }

  // Trường hợp 2: Có lỗi khi tải -> hiển thị thông báo lỗi
  if (error) {
    return (
      <EmptyState
        embedded
        title="Không thể tải danh sách danh mục."
        description="Vui lòng thử lại."
      />
    );
  }

  // Trường hợp 3: Hệ thống chưa có danh mục nào -> hiển thị trạng thái rỗng
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

  // Trường hợp 4: Có danh mục nhưng bộ lọc không tìm thấy kết quả -> gợi ý xóa bộ lọc
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

  // Trường hợp 5: Có dữ liệu -> hiển thị bảng danh sách
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
      {/* Duyệt qua mảng categories và hiển thị từng dòng */}
      {categories.map((category) => (
        <AdminCategoryRow key={category.id} category={category} onEdit={onEdit} />
      ))}
    </Box>
  );
}
