// ===== AdminLevelList.jsx =====
// Component hiển thị danh sách trình độ khóa học dưới dạng bảng.
// Xử lý các trạng thái: đang tải, lỗi, không có dữ liệu, không tìm thấy kết quả lọc.

import { Box, Typography } from '@mui/material';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import EmptyState from '@/shared/ui/EmptyState';   // Component hiển thị khi không có dữ liệu
import Loading from '@/shared/ui/Loading';           // Component hiển thị khi đang tải
import AdminLevelRow from './AdminLevelRow';         // Component cho từng dòng trình độ
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  ADMIN_LEVEL_TABLE_GRID_COLUMNS,  // Cấu hình số cột grid
  ADMIN_LEVEL_TABLE_HEADERS,        // Mảng chứa tên các cột
} from '@/features/admin/utils/adminLevelUtils';

// Style cho dòng tiêu đề của bảng
const TABLE_ROW_SX = {
  display: { xs: 'none', md: 'grid' },  // Chỉ hiện trên desktop
  gridTemplateColumns: ADMIN_LEVEL_TABLE_GRID_COLUMNS,
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
      {ADMIN_LEVEL_TABLE_HEADERS.map((label, index) => (
        <Typography
          key={label}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            // Cột cuối cùng (hành động) căn phải, các cột khác căn trái
            textAlign: index === ADMIN_LEVEL_TABLE_HEADERS.length - 1 ? 'right' : 'left',
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

// Component chính: nhận danh sách trình độ và các hàm xử lý
export default function AdminLevelList({
  levels,           // Mảng các trình độ cần hiển thị
  loading,          // true nếu đang tải dữ liệu từ API
  error,            // true nếu có lỗi khi tải
  hasAnyLevels,     // true nếu có ít nhất 1 trình độ trong hệ thống
  isFiltered,       // true nếu người dùng đang dùng bộ lọc
  onEdit,           // Hàm được gọi khi bấm nút sửa
  onClearFilters,   // Hàm được gọi khi bấm "Xóa bộ lọc"
}) {

  // Trường hợp 1: Đang tải dữ liệu -> hiển thị spinner
  if (loading) {
    return <Loading message="Đang tải danh sách trình độ..." />;
  }

  // Trường hợp 2: Có lỗi khi tải -> hiển thị thông báo lỗi
  if (error) {
    return (
      <EmptyState
        embedded
        title="Không thể tải danh sách trình độ."
        description="Vui lòng thử lại."
      />
    );
  }

  // Trường hợp 3: Hệ thống chưa có trình độ nào -> hiển thị trạng thái rỗng
  if (!hasAnyLevels) {
    return (
      <EmptyState
        embedded
        icon={LayersOutlinedIcon}
        title="Chưa có trình độ nào."
        description="Danh sách trình độ sẽ hiển thị tại đây khi có dữ liệu."
      />
    );
  }

  // Trường hợp 4: Có trình độ nhưng bộ lọc không tìm thấy kết quả -> gợi ý xóa bộ lọc
  if (levels.length === 0 && isFiltered) {
    return (
      <EmptyState
        embedded
        icon={SearchOffOutlinedIcon}
        title="Không tìm thấy trình độ nào."
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
      {/* Duyệt qua mảng levels và hiển thị từng dòng */}
      {levels.map((level) => (
        <AdminLevelRow key={level.id} level={level} onEdit={onEdit} />
      ))}
    </Box>
  );
}
