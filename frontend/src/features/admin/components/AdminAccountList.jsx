// ===== AdminAccountList.jsx =====
// Component hiển thị danh sách tài khoản dưới dạng bảng.
// Xử lý các trạng thái: đang tải, lỗi, không có dữ liệu, không tìm thấy kết quả lọc.
//
// 📍 VỊ TRÍ TRONG LUỒNG (BƯỚC 2 - TRUNG GIAN):
// File này nhận hàm onEdit từ trang chính (AdminAccountManagementPage) và
// truyền xuống từng dòng (AdminAccountRow). Khi người dùng bấm nút sửa ở
// AdminAccountRow, hàm onEdit được gọi và truyền account lên đây rồi lên trang chính.
// ➡️ Đến từ: AdminAccountRow.jsx (dòng 178) — frontend/src/features/admin/components/AdminAccountRow.jsx
// ➡️ Đi tiếp: AdminAccountManagementPage.jsx (dòng 230) — frontend/src/features/admin/pages/AdminAccountManagementPage.jsx


import { Box, Typography } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import EmptyState from '@/shared/ui/EmptyState';   // Component hiển thị khi không có dữ liệu
import Loading from '@/shared/ui/Loading';           // Component hiển thị khi đang tải
import AdminAccountRow from './AdminAccountRow';     // Component cho từng dòng tài khoản
import { MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';
import {
  ADMIN_ACCOUNT_TABLE_HEADERS,      // Mảng chứa tên các cột (VD: ["Tên", "Email", "Vai trò", ...])
  ADMIN_ACCOUNT_TABLE_LAYOUT_SX,    // Cấu hình layout của bảng
  getAdminAccountHeaderCellSx,      // Hàm lấy style cho từng ô header
} from '@/features/admin/utils/adminAccountUtils';

// Component con: hiển thị dòng tiêu đề của bảng (chỉ hiện trên desktop)
function ListHeader() {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'grid' },  // Ẩn trên mobile, hiện trên desktop
        ...ADMIN_ACCOUNT_TABLE_LAYOUT_SX,
        py: 1.25,
        bgcolor: 'rgba(15,23,42,0.02)',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
      }}
    >
      {/* Duyệt qua mảng headers để hiển thị từng cột */}
      {ADMIN_ACCOUNT_TABLE_HEADERS.map((label, index) => (
        <Typography
          key={label}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            ...getAdminAccountHeaderCellSx(index),  // Style riêng cho từng cột
          }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

// Component chính: nhận danh sách tài khoản và các hàm xử lý
export default function AdminAccountList({
  accounts,         // Mảng các tài khoản cần hiển thị
  loading,          // true nếu đang tải dữ liệu từ API
  error,            // true nếu có lỗi khi tải
  hasAnyAccounts,   // true nếu có ít nhất 1 tài khoản trong hệ thống (không phải do lọc)
  isFiltered,       // true nếu người dùng đang dùng bộ lọc
  onEdit,           // Hàm được gọi khi bấm nút sửa
  onClearFilters,   // Hàm được gọi khi bấm "Xóa bộ lọc"
}) {

  // Trường hợp 1: Đang tải dữ liệu -> hiển thị spinner
  if (loading) {
    return <Loading message="Đang tải danh sách tài khoản..." />;
  }

  // Trường hợp 2: Có lỗi khi tải -> hiển thị thông báo lỗi
  if (error) {
    return (
      <EmptyState
        embedded
        title="Không thể tải danh sách tài khoản."
        description="Vui lòng thử lại."
      />
    );
  }

  // Trường hợp 3: Hệ thống chưa có tài khoản nào -> hiển thị trạng thái rỗng
  if (!hasAnyAccounts) {
    return (
      <EmptyState
        embedded
        icon={PeopleAltOutlinedIcon}
        title="Chưa có tài khoản nào."
        description="Danh sách tài khoản sẽ hiển thị tại đây khi có dữ liệu."
      />
    );
  }

  // Trường hợp 4: Có tài khoản nhưng bộ lọc không tìm thấy kết quả -> hiển thị gợi ý xóa bộ lọc
  if (accounts.length === 0 && isFiltered) {
    return (
      <EmptyState
        embedded
        icon={SearchOffOutlinedIcon}
        title="Không tìm thấy tài khoản nào."
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
      {/* Duyệt qua mảng accounts và hiển thị từng dòng */}
      {accounts.map((account) => (
        <AdminAccountRow key={account.id} account={account} onEdit={onEdit} />
      ))}
    </Box>
  );
}
