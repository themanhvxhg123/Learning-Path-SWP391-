// ===== AdminAccountRow.jsx =====
// Component hiển thị một dòng (row) trong danh sách tài khoản.
// Mỗi dòng gồm: avatar, tên, email, vai trò, trạng thái, ngày tạo và nút chỉnh sửa.
//
// 📍 VỊ TRÍ TRONG LUỒNG (BƯỚC 1 - ĐIỂM BẮT ĐẦU):
// Đây là file hiển thị từng dòng tài khoản. Nút chỉnh sửa (icon bút) nằm ở đây.
// Khi người dùng bấm nút, nó gọi hàm onEdit và truyền object account lên.
// ➡️ Đi tiếp sang file: AdminAccountList.jsx (dòng 114)
//    frontend/src/features/admin/components/AdminAccountList.jsx


import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import {
  ADMIN_ACCOUNT_ROLE_CHIP_SX,    // Màu sắc cho chip vai trò (Admin/Mentor/Student)
  ADMIN_ACCOUNT_ROLE_LABELS,      // Nhãn hiển thị cho từng vai trò
  ADMIN_ACCOUNT_STATUS_CHIP_SX,   // Màu sắc cho chip trạng thái (Active/Inactive)
  ADMIN_ACCOUNT_STATUS_LABELS,    // Nhãn hiển thị cho từng trạng thái
  ADMIN_ACCOUNT_TABLE_LAYOUT_SX,  // Cấu hình layout (grid columns, gap, padding...)
  formatAccountDate,              // Hàm định dạng ngày tạo tài khoản
  getAccountInitials,             // Hàm lấy chữ cái đầu của tên (VD: "Nguyễn Văn A" -> "NV")
} from '@/features/admin/utils/adminAccountUtils';
import { PRIMARY, TEXT, MUTED } from '@/features/mentor/components/course/mentorCourseCreateStyles';

// Style dùng chung cho các chip (vai trò, trạng thái) - bo tròn, chữ đậm
const PILL_CHIP_SX = {
  borderRadius: '999px',   // Bo tròn hoàn toàn (hình viên thuốc)
  height: 24,
  fontSize: 12,
  fontWeight: 700,
  '& .MuiChip-label': { px: 1.2, fontWeight: 700 },
};

// Style dùng chung cho các giá trị text (email, ngày tạo) - chữ nhỡ, gọn
const VALUE_SX = {
  fontSize: 13,
  fontWeight: 500,
  color: TEXT,
  lineHeight: 1.45,
  overflow: 'hidden',
  textOverflow: 'ellipsis',   // Nếu text quá dài thì hiển thị dấu "..."
  whiteSpace: 'nowrap',
};

// Component con: hiển thị một trường dữ liệu trên màn hình nhỏ (điện thoại)
// Chỉ hiện khi màn hình < md (medium), ẩn trên màn hình lớn
function MobileField({ label, value }) {
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: MUTED, mb: 0.25 }}>{label}</Typography>
      <Typography sx={VALUE_SX}>{value}</Typography>
    </Box>
  );
}

// Component con: hiển thị giá trị text trên màn hình lớn (máy tính)
// Chỉ hiện khi màn hình >= md, ẩn trên màn hình nhỏ
function DesktopValue({ value }) {
  return (
    <Typography sx={{ ...VALUE_SX, display: { xs: 'none', md: 'block' } }}>{value}</Typography>
  );
}

// Component chính: nhận vào thông tin 1 tài khoản và hàm xử lý khi bấm nút sửa
export default function AdminAccountRow({ account, onEdit }) {
  // Lấy màu sắc cho chip vai trò, nếu không có thì mặc định màu Student
  const roleSx = ADMIN_ACCOUNT_ROLE_CHIP_SX[account.role] ?? ADMIN_ACCOUNT_ROLE_CHIP_SX.Student;
  // Lấy màu sắc cho chip trạng thái, nếu không có thì mặc định màu ACTIVE
  const statusSx = ADMIN_ACCOUNT_STATUS_CHIP_SX[account.status] ?? ADMIN_ACCOUNT_STATUS_CHIP_SX.ACTIVE;

  return (
    // Container chính: dùng grid layout, trên mobile là 1 cột, trên desktop là nhiều cột
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.gridTemplateColumns },
        columnGap: { xs: 0, md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.columnGap },
        px: { xs: 2, md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.px },
        alignItems: { xs: 'stretch', md: ADMIN_ACCOUNT_TABLE_LAYOUT_SX.alignItems },
        width: '100%',
        boxSizing: 'border-box',
        rowGap: { xs: 1.25, md: 0 },
        py: { xs: 2, md: 1.75 },
        borderBottom: '1px solid rgba(15,23,42,0.06)',  // Đường kẻ ngăn cách giữa các dòng
        '&:last-child': { borderBottom: 'none' },        // Dòng cuối cùng không có border
      }}
    >
      {/* Cột 1: Avatar + Tên + Username */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, justifySelf: 'start' }}>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: alpha(PRIMARY, 0.12),
            color: PRIMARY,
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getAccountInitials(account.fullName)}  {/* Hiển thị chữ cái đầu của tên */}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {account.fullName}
          </Typography>
          {/* Nếu có username thì hiển thị, không thì bỏ qua */}
          {account.username ? (
            <Typography sx={{ fontSize: 12, color: MUTED }}>@{account.username}</Typography>
          ) : null}
        </Box>
      </Box>

      {/* Cột 2: Email */}
      <Box sx={{ minWidth: 0, justifySelf: 'start' }}>
        <MobileField label="Email" value={account.email} />
        <DesktopValue value={account.email} />
      </Box>

      {/* Cột 3: Vai trò (Admin/Mentor/Student) - hiển thị dạng chip màu */}
      <Box sx={{ justifySelf: 'start' }}>
        <MobileField
          label="Vai trò"
          value={ADMIN_ACCOUNT_ROLE_LABELS[account.role] ?? account.role}
        />
        <Chip
          size="small"
          label={ADMIN_ACCOUNT_ROLE_LABELS[account.role] ?? account.role}
          sx={{
            ...PILL_CHIP_SX,
            ...roleSx,
            display: { xs: 'none', md: 'inline-flex' },
          }}
        />
      </Box>

      {/* Cột 4: Trạng thái (Active/Inactive) - hiển thị dạng chip màu */}
      <Box sx={{ justifySelf: 'start' }}>
        <MobileField
          label="Trạng thái"
          value={ADMIN_ACCOUNT_STATUS_LABELS[account.status] ?? account.status}
        />
        <Chip
          size="small"
          label={ADMIN_ACCOUNT_STATUS_LABELS[account.status] ?? account.status}
          sx={{
            ...PILL_CHIP_SX,
            ...statusSx,
            display: { xs: 'none', md: 'inline-flex' },
          }}
        />
      </Box>

      {/* Cột 5: Ngày tạo tài khoản */}
      <Box sx={{ minWidth: 0, justifySelf: 'start' }}>
        <MobileField label="Ngày tạo" value={formatAccountDate(account.createdAt)} />
        <DesktopValue value={formatAccountDate(account.createdAt)} />
      </Box>

      {/* Cột 6: Nút hành động (chỉnh sửa) */}
      {/* ===== NÚT CHỈNH SỬA TÀI KHOẢN =====
          Đây là nút (icon bút) nằm ở cột cuối cùng của mỗi dòng tài khoản.
          CÁCH HOẠT ĐỘNG: Khi người dùng bấm vào, nó gọi hàm onEdit và truyền
          toàn bộ object account lên. Hàm onEdit này được truyền từ file cha
          (AdminAccountList) xuống.
          ➡️ Đi tiếp: AdminAccountList.jsx (dòng 114) — xem file:
             frontend/src/features/admin/components/AdminAccountList.jsx */}
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: { xs: 'flex-start', md: 'flex-end' }, justifySelf: 'end' }}>
        <Tooltip title="Chỉnh sửa vai trò & trạng thái">
          <IconButton
            size="small"
            aria-label="Chỉnh sửa tài khoản"
            onClick={() => onEdit?.(account)}  // Gọi hàm onEdit khi bấm nút

            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              border: '1px solid rgba(15,23,42,0.08)',
              color: MUTED,
              '&:hover': {
                color: PRIMARY,
                bgcolor: alpha(PRIMARY, 0.06),
                borderColor: alpha(PRIMARY, 0.2),
              },
            }}
          >
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
